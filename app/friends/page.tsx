'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserPlus, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { friendshipAPI } from '@/lib/api/friendshipAPI';
import { userAPI } from '@/lib/api/userAPI';
import { useAuth } from '@/context/AuthContext';
import type { UserProfile, FriendshipResponseDto } from '@/lib/types';

type FriendSummaryDto = {
  id: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string | null;
  point?: number;
  primaryBadge?: { id: string; name: string } | null;
  isMutual?: boolean;
};

type PendingRequestItem = {
  friendshipId: string;
  followerId: string;
  follower: UserProfile | null;
  createdAt?: string;
};

function FriendsPageContent() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const initTab = (searchParams.get('tab') ?? 'all') as 'all' | 'requests' | 'suggestions';
  const [tab, setTab] = useState<'all' | 'requests' | 'suggestions'>(initTab);

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Friends</h1>
              <p className="text-muted-foreground">
                Đăng nhập để sử dụng tính năng này
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
    );
  }

  // ====== state
  const [friends, setFriends] = useState<FriendSummaryDto[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [requests, setRequests] = useState<PendingRequestItem[]>([]);
  const [loadingReq, setLoadingReq] = useState(true);
  const [outgoingPendingIds, setOutgoingPendingIds] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(true);
  const [requested, setRequested] = useState<UserProfile[]>([]);
  const [loadingRequested, setLoadingRequested] = useState(true);

  // Current userId
  const currentUserId = profile?.id;

  const getTs = (v: any) => (v ? new Date(v).getTime() : 0);

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);

  // ====== loaders
  const buildProfilesByIds = async (ids: string[]): Promise<UserProfile[]> => {
    if (!ids.length) return [];
    const items: UserProfile[] = [];
    await Promise.all(
      ids.map(async (uid) => {
        try {
          const u = await userAPI.getById(uid);
          items.push(u);
        } catch {
          // ignore 404/err
        }
      })
    );
    items.sort((a, b) => (b.point ?? 0) - (a.point ?? 0));
    return items;
  };

  const loadRelations = async () => {
    if (!currentUserId) return;
    setLoadingFriends(true);
    setLoadingReq(true);
    setLoadingRequested(true);
    try {
      const raw: FriendshipResponseDto[] = await friendshipAPI.getMineRaw();

      // Partition
      const accepted = raw.filter(
        (r: any) =>
          r?.status === 'Accepted' || r?.Status === 'Accepted' || r?.status === 1
      );

      const pending = raw.filter(
        (r: any) =>
          r?.status === 'Pending' || r?.Status === 'Pending' || r?.status === 0
      );

      // ===== Outgoing pending (mình là follower) -> Requested tab
      const out = pending.filter(
        (r: any) => (r?.followerId ?? r?.FollowerId) === currentUserId
      );
      const outUserIds: string[] = out.map(
        (r: any) => (r?.followedUserId ?? r?.FollowedUserId) as string
      );

      // Lưu set id để tiện dùng nơi khác (ví dụ loại khỏi suggestions)
      setOutgoingPendingIds(new Set(outUserIds));

      // Build requested profiles ngay tại đây
      const requestedProfiles: UserProfile[] = [];
      await Promise.all(
        outUserIds.map(async (uid) => {
          try {
            const u = await userAPI.getById(uid);
            requestedProfiles.push(u);
          } catch {
            /* ignore 404/err */
          }
        })
      );
      requestedProfiles.sort((a, b) => (b.point ?? 0) - (a.point ?? 0));
      setRequested(requestedProfiles);

      // ===== Inbound pending (requests): mình là FollowedUser
      const inbound = pending.filter(
        (r: any) => (r?.followedUserId ?? r?.FollowedUserId) === currentUserId
      );

      // Build requests list
      const followerIds = Array.from(
        new Set(
          inbound.map((r: any) => r?.followerId ?? r?.FollowerId).filter(Boolean)
        )
      );
      const profileMap: Record<string, UserProfile> = {};
      await Promise.all(
        followerIds.map(async (uid) => {
          try {
            const u = await userAPI.getById(uid);
            profileMap[uid] = u;
          } catch {
            /* ignore */
          }
        })
      );
      const reqItems: PendingRequestItem[] = inbound
        .map((r: any) => ({
          friendshipId: r?.id ?? r?.Id,
          followerId: r?.followerId ?? r?.FollowerId,
          follower: profileMap[r?.followerId ?? r?.FollowerId] ?? null,
          createdAt: r?.createdAt ?? r?.CreatedAt,
        }))
        .sort((a, b) => getTs(b.createdAt) - getTs(a.createdAt));
      setRequests(reqItems);

      // ===== All Friends (accepted): lấy "người còn lại" trong cặp và fetch profile
      const otherUserIds = Array.from(
        new Set(
          accepted.map((r: any) => {
            const followerId = r?.followerId ?? r?.FollowerId;
            const followedId = r?.followedUserId ?? r?.FollowedUserId;
            return followerId === currentUserId ? followedId : followerId;
          })
        )
      );

      const friendProfiles: FriendSummaryDto[] = [];
      await Promise.all(
        otherUserIds.map(async (uid) => {
          try {
            const u = await userAPI.getById(uid);
            friendProfiles.push({
              id: u.id,
              username: u.username,
              fullName: u.fullName ?? '',
              avatarUrl: u.avatarUrl,
              point: u.point,
              isMutual: true,
            });
          } catch {
            /* ignore */
          }
        })
      );
      friendProfiles.sort((a, b) => (b.point ?? 0) - (a.point ?? 0));
      setFriends(friendProfiles);
    } catch (e: any) {
      setFriends([]);
      setRequests([]);
      setRequested([]);
      setOutgoingPendingIds(new Set());
      toast({
        title: 'Error',
        description: e?.message ?? 'Failed to load relations',
        variant: 'destructive',
      });
    } finally {
      setLoadingFriends(false);
      setLoadingReq(false);
      setLoadingRequested(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      setLoadingSuggest(true);
      const all = await userAPI.getAll();
      const friendIdSet = new Set(friends.map(f => f.id)); // accepted only
      const pendingOutSet = outgoingPendingIds;            // đang chờ người ta accept

      const filtered = all.filter(
        (u) =>
          !friendIdSet.has(u.id) &&
          !pendingOutSet.has(u.id) &&
          u.id !== currentUserId
      );

      filtered.sort((a, b) => (b.point ?? 0) - (a.point ?? 0));
      setSuggestions(filtered);
    } catch (e: any) {
      setSuggestions([]);
      toast({
        title: 'Error',
        description: e?.message ?? 'Failed to load suggestions',
        variant: 'destructive',
      });
    } finally {
      setLoadingSuggest(false);
    }
  };

  useEffect(() => {
    setTab(initTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initTab]);

  useEffect(() => {
    loadSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friends, Array.from(outgoingPendingIds).join(',')]);

  useEffect(() => {
    if (currentUserId) loadRelations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // ====== actions
  const [workingIds, setWorkingIds] = useState<Record<string, boolean>>({});

  const handleFollow = async (userId: string) => {
    if (workingIds[userId]) return;
    setWorkingIds(prev => ({ ...prev, [userId]: true }));
    try {
      await friendshipAPI.follow({ followedUserId: userId });
      toast({ title: 'Success', description: 'Follow request sent' });
      await loadRelations();
      await loadSuggestions();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed to follow', variant: 'destructive' });
    } finally {
      setWorkingIds(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleUnfollow = async (userId: string) => {
    if (workingIds[userId]) return;
    setWorkingIds(prev => ({ ...prev, [userId]: true }));
    try {
      await friendshipAPI.cancelFollow(userId);
      toast({ title: 'Success', description: 'Unfollowed / Request canceled' });
      await loadRelations();
      await loadSuggestions();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed to unfollow', variant: 'destructive' });
    } finally {
      setWorkingIds(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleAccept = async (friendshipId: string) => {
    if (workingIds[friendshipId]) return;
    setWorkingIds((p) => ({ ...p, [friendshipId]: true }));
    try {
      await friendshipAPI.accept(friendshipId);
      toast({ title: 'Accepted', description: 'You are now connected' });
      await loadRelations();
      await loadSuggestions();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed to accept', variant: 'destructive' });
    } finally {
      setWorkingIds((p) => ({ ...p, [friendshipId]: false }));
    }
  };

  const handleReject = async (friendshipId: string) => {
    if (workingIds[friendshipId]) return;
    setWorkingIds((p) => ({ ...p, [friendshipId]: true }));
    try {
      await friendshipAPI.reject(friendshipId);
      toast({ title: 'Rejected', description: 'Request removed' });
      await loadRelations();
      await loadSuggestions();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed to reject', variant: 'destructive' });
    } finally {
      setWorkingIds((p) => ({ ...p, [friendshipId]: false }));
    }
  };

  // ====== render
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Friends</h1>
              <p className="text-muted-foreground">Connect with other students</p>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList>
                <TabsTrigger value="all">
                  <Users className="mr-2 h-4 w-4" />
                  All Friends ({loadingFriends ? '…' : friends.length})
                </TabsTrigger>
                <TabsTrigger value="requests">
                  Requests ({loadingReq ? '…' : requests.length})
                </TabsTrigger>
                <TabsTrigger value="requested">
                  Requested ({loadingRequested ? '…' : requested.length})
                </TabsTrigger>
                <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
              </TabsList>

              {/* All Friends */}
              <TabsContent value="all" className="space-y-4 mt-6">
                {loadingFriends ? (
                  <Card>
                    <CardContent className="p-12 text-center">Loading friends…</CardContent>
                  </Card>
                ) : friends.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">No friends yet</CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {friends.map((friend) => (
                      <Card key={friend.id}>
                        <CardContent className="p-6">
                          <div className="flex flex-col items-center text-center space-y-3">
                            <Avatar className="h-20 w-20">
                              <AvatarImage
                                src={friend.avatarUrl ?? undefined}
                                alt={friend.fullName ?? friend.username ?? ''}
                              />
                              <AvatarFallback>
                                {(friend.fullName ?? friend.username ?? 'U')
                                  .charAt(0)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <Link
                                href={`/profile/${friend.id}`}
                                className="font-medium hover:underline"
                              >
                                {friend.fullName ?? friend.username ?? 'Unknown'}
                              </Link>
                              <div className="mt-1 flex items-center justify-center gap-2">
                                {friend.primaryBadge?.name && (
                                  <Badge variant="secondary">{friend.primaryBadge.name}</Badge>
                                )}
                                {typeof friend.point === 'number' && (
                                  <Badge variant="outline">{friend.point} pts</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 w-full">
                              <Button asChild variant="outline" size="sm" className="flex-1">
                                <Link href={`/profile/${friend.id}`}>View Profile</Link>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="flex-1"
                                onClick={() => handleUnfollow(friend.id)}
                                disabled={!!workingIds[friend.id]}
                              >
                                <X className="mr-2 h-4 w-4" />
                                Unfollow
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Requests */}
              <TabsContent value="requests" className="space-y-4 mt-6">
                {loadingReq ? (
                  <Card>
                    <CardContent className="p-12 text-center">Loading requests…</CardContent>
                  </Card>
                ) : requests.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">No pending requests</CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {requests.map((r) => {
                      const u = r.follower;
                      const key = r.friendshipId;
                      return (
                        <Card key={key}>
                          <CardContent className="p-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                              <Avatar className="h-20 w-20">
                                <AvatarImage src={u?.avatarUrl ?? undefined} alt={u?.fullName ?? ''} />
                                <AvatarFallback>
                                  {u?.fullName?.charAt(0).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <Link href={`/profile/${u?.id}`} className="font-medium hover:underline">
                                  {u?.fullName ?? 'Unknown'}
                                </Link>
                                {typeof u?.point === 'number' && (
                                  <div className="mt-1">
                                    <Badge variant="secondary">{u.point} pts</Badge>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 w-full">
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleAccept(key)}
                                  disabled={!!workingIds[key]}
                                >
                                  <Check className="mr-2 h-4 w-4" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="flex-1"
                                  onClick={() => handleReject(key)}
                                  disabled={!!workingIds[key]}
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="requested" className="space-y-6 mt-6">
                {loadingRequested ? (
                  <Card>
                    <CardContent className="p-12 text-center">Loading requested…</CardContent>
                  </Card>
                ) : requested.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">No outgoing requests</CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {requested.map((u) => {
                      const disabled = !!workingIds[u.id];
                      return (
                        <Card key={u.id}>
                          <CardContent className="p-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                              <Avatar className="h-20 w-20">
                                <AvatarImage src={u.avatarUrl ?? undefined} alt={u.fullName ?? ''} />
                                <AvatarFallback>{u.fullName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <Link href={`/profile/${u.id}`} className="font-medium hover:underline">
                                  {u.fullName}
                                </Link>
                                {typeof u.point === 'number' && (
                                  <Badge variant="secondary" className="mt-1">
                                    {u.point} pts
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-2 w-full">
                                <Button asChild variant="outline" size="sm" className="flex-1">
                                  <Link href={`/profile/${u.id}`}>View Profile</Link>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="flex-1"
                                  onClick={() => handleUnfollow(u.id)} // huỷ yêu cầu
                                  disabled={disabled}
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Cancel request
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Suggestions */}
              <TabsContent value="suggestions" className="space-y-6 mt-6">
                {loadingSuggest ? (
                  <Card>
                    <CardContent className="p-12 text-center">Loading suggestions…</CardContent>
                  </Card>
                ) : suggestions.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">No suggestions</CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suggestions.map((u) => {
                      const disabled = !!workingIds[u.id];
                      const isFriend = friendIds.has(u.id);
                      return (
                        <Card key={u.id}>
                          <CardContent className="p-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                              <Avatar className="h-20 w-20">
                                <AvatarImage src={u.avatarUrl ?? undefined} alt={u.fullName ?? ''} />
                                <AvatarFallback>
                                  {u.fullName?.charAt(0).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <Link href={`/profile/${u.id}`} className="font-medium hover:underline">
                                  {u.fullName}
                                </Link>
                                {typeof u.point === 'number' && (
                                  <Badge variant="secondary" className="mt-1">
                                    {u.point} pts
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-2 w-full">
                                <Button asChild variant="outline" size="sm" className="flex-1">
                                  <Link href={`/profile/${u.id}`}>View Profile</Link>
                                </Button>

                                {isFriend ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="flex-1"
                                    onClick={() => handleUnfollow(u.id)}
                                    disabled={disabled}
                                  >
                                    <X className="mr-2 h-4 w-4" />
                                    Unfollow
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleFollow(u.id)}
                                    disabled={disabled}
                                  >
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Follow
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function FriendsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold">Friends</h1>
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    }>
      <FriendsPageContent />
    </Suspense>
  );
}
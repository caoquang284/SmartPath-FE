'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Award,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  FileText,
  Image,
  Mail,
  MessageSquare,
  Phone,
  GraduationCap,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { PostCard } from '@/components/forum/PostCard';
import type { UserProfile, BadgeAward, FriendshipResponseDto } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { UserBadge } from '@/components/badges/UserBadge';
import { userAPI } from '@/lib/api/userAPI';
import { chatAPI } from '@/lib/api/chatAPI';
import { friendshipAPI } from '@/lib/api/friendshipAPI';
import AvatarCropDialog from '@/components/profile/AvatarCropDialog';
import { postAPI } from '@/lib/api/postAPI';
import { mapPostToUI } from '@/lib/mappers/postMapper';
import type { UIPost } from '@/lib/mappers/postMapper';

type ProfileStats = {
  postsCount: number;
  commentsCount: number;
  likesReceived: number;
};

// ===== NEW: trạng thái quan hệ
type RelationState = 'none' | 'accepted' | 'outgoing' | 'incoming';

export default function ProfilePage() {
  const params = useParams();
  const profileId = params.id as string;
  const { profile: currentUser } = useAuth();
  const { toast } = useToast();

  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [primaryBadge, setPrimaryBadge] = useState<BadgeAward | null>(null);
  const [posts, setPosts] = useState<UIPost[]>([]);
  const [stats, setStats] = useState<ProfileStats>({
    postsCount: 0,
    commentsCount: 0,
    likesReceived: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState({
    email: '',
    username: '',
    full_name: '',
    phone_number: '',
    avatar_url: '',
    field_of_study: '',
    faculty: '',
    year_of_study: '',
    bio: '',
  });

  const isOwnProfile = currentUser?.id === profileId;

  // ===== NEW: relation state
  const [relation, setRelation] = useState<RelationState>('none');
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const u = await userAPI.getById(profileId);
      setProfileData(u);

      const pb =
        (u as any).primaryBadge ??
        (u as any).primary_badge ??
        ((u as any).badges?.length ? (u as any).badges[0] : null);
      setPrimaryBadge(pb ?? null);

      setPosts([]); // cắm postAPI khi sẵn sàng

      setStats({
        postsCount: 0,
        commentsCount: 0,
        likesReceived: 0,
      });
    } catch (e) {
      console.error('Failed to load profile', e);
      setProfileData(null);
      setPrimaryBadge(null);
      setPosts([]);
      setStats({ postsCount: 0, commentsCount: 0, likesReceived: 0 });
      toast({
        title: 'Không tải được hồ sơ',
        description: 'Vui lòng thử lại sau.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [profileId, toast]);

  const loadPostsOfUser = useCallback(async (userId: string) => {
    try {
      const raw = await postAPI.getByUser(userId);
      const mapped = raw.map(mapPostToUI);

      // Tính thống kê cơ bản
      const postsCount = mapped.length;
      const commentsCount = mapped.reduce((acc, p) => acc + (p.comments_count ?? 0), 0);
      const likesReceived = mapped.reduce((acc, p) => acc + (p.positiveReactionCount ?? 0), 0);

      setPosts(mapped);
      setStats({ postsCount, commentsCount, likesReceived });
    } catch (e) {
      console.error('Failed to load user posts', e);
      setPosts([]);
      setStats({ postsCount: 0, commentsCount: 0, likesReceived: 0 });
    }
  }, []);

  // ===== NEW: load quan hệ giữa currentUser và profileId
  const loadRelation = useCallback(async () => {
    if (!currentUser?.id || !profileId || currentUser.id === profileId) {
      setRelation('none');
      setFriendshipId(null);
      return;
    }
    try {
      const items: FriendshipResponseDto[] = await friendshipAPI.getMineRaw();

      // tìm record có 2 đầu là currentUser.id và profileId
      const r = items.find((x: any) => {
        const followerId = x?.followerId ?? x?.FollowerId;
        const followedId = x?.followedUserId ?? x?.FollowedUserId;
        return (
          (followerId === currentUser.id && followedId === profileId) ||
          (followerId === profileId && followedId === currentUser.id)
        );
      });

      if (!r) {
        setRelation('none');
        setFriendshipId(null);
        return;
      }

      const status = (r as any)?.status ?? (r as any)?.Status; // 'Pending' | 'Accepted' (hoặc 0/1)
      const followerId = (r as any)?.followerId ?? (r as any)?.FollowerId;

      if (status === 'Accepted' || status === 1) {
        setRelation('accepted');
        setFriendshipId((r as any)?.id ?? (r as any)?.Id ?? null);
      } else if (status === 'Pending' || status === 0) {
        // nếu mình là follower => outgoing; ngược lại incoming
        if (followerId === currentUser.id) {
          setRelation('outgoing');
        } else {
          setRelation('incoming');
        }
        setFriendshipId((r as any)?.id ?? (r as any)?.Id ?? null);
      } else {
        setRelation('none');
        setFriendshipId(null);
      }
    } catch {
      setRelation('none');
      setFriendshipId(null);
    }
  }, [currentUser?.id, profileId]);

  useEffect(() => {
    if (!profileId) return;
    loadProfile();
  }, [profileId, loadProfile]);

  useEffect(() => {
    loadRelation();
  }, [loadRelation]);

  useEffect(() => {
    if (!isEditOpen || !profileData) return;
    setFormState({
      email: profileData.email ?? '',
      username: profileData.username ?? '',
      full_name: profileData.fullName ?? '',
      phone_number: profileData.phoneNumber ?? '',
      avatar_url: profileData.avatarUrl ?? '',
      field_of_study:
        (profileData as any).field_of_study ??
        (profileData as any).major ??
        '',
      faculty: (profileData as any).faculty ?? '',
      year_of_study:
        (profileData as any).yearOfStudy != null
          ? String((profileData as any).yearOfStudy)
          : '',
      bio: profileData.bio ?? '',
    });
  }, [isEditOpen, profileData]);

  useEffect(() => {
    if (!profileId) return;
    loadPostsOfUser(profileId);
  }, [profileId, loadPostsOfUser]);

  const prune = <T extends Record<string, any>>(obj: T): Partial<T> => {
    const out: Partial<T> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v == null) continue;
      if (typeof v === 'string') {
        const t = v.trim();
        if (!t) continue;
        (out as any)[k] = t;
      } else {
        (out as any)[k] = v;
      }
    }
    return out;
  };

  const handleEditSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!profileData) return;

      setSaving(true);
      try {
        const raw = {
          email: formState.email || profileData.email,
          username: formState.username?.trim() || profileData.username,

          fullName: formState.full_name,
          phoneNumber: formState.phone_number,
          avatarUrl: formState.avatar_url,
          major: formState.field_of_study,
          faculty: formState.faculty,
          yearOfStudy:
            formState.year_of_study.trim() === ''
              ? undefined
              : Number(formState.year_of_study),
          bio: formState.bio,
        };
        const payload = prune(raw);
        const updated = await userAPI.update(profileId, payload);

        setProfileData(updated);
        setIsEditOpen(false);
        toast({
          title: 'Đã cập nhật hồ sơ',
          description: 'Thông tin của bạn đã được lưu.',
        });
      } catch (error) {
        console.error('Failed to update profile', error);
        toast({
          title: 'Cập nhật thất bại',
          description: 'Vui lòng kiểm tra lại dữ liệu hoặc thử lại sau.',
          variant: 'destructive',
        });
      } finally {
        setSaving(false);
      }
    },
    [formState, profileData, profileId, toast]
  );

  const handleAvatarUploaded = useCallback(
    async (fileUrl: string) => {
      if (!profileId) return;
      try {
        let email = profileData?.email;
        let username = profileData?.username;

        if (!email || !username) {
          const u = await userAPI.getById(profileId);
          email = u.email;
          username = u.username;
        }

        const payload = {
          email,
          username,
          avatarUrl: fileUrl,
        };

        const updated = await userAPI.update(profileId, payload);
        setProfileData(updated);
        setProfileData((p) => (p ? { ...p, avatarUrl: `${fileUrl}?v=${Date.now()}` } : p));

        toast({ title: 'Ảnh đại diện đã được cập nhật' });
        setAvatarDialogOpen(false);
      } catch (e) {
        console.error(e);
        toast({
          title: 'Cập nhật avatar thất bại',
          description: 'Upload thành công nhưng cập nhật hồ sơ bị lỗi. Hãy thử lại.',
          variant: 'destructive',
        });
      }
    },
    [profileId, profileData, toast]
  );

  const router = useRouter();

  const handleMessage = useCallback(async () => {
    if (!profileId) return;
    try {
      const chat = await chatAPI.getOrCreateDirect(profileId);
      router.push(`/messages/${chat.id}`);
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Cannot open chat', variant: 'destructive' });
    }
  }, [profileId, router, toast]);

  const doFollow = async () => {
    if (!currentUser?.id || !profileId || working) return;
    setWorking(true);
    try {
      await friendshipAPI.follow({ followedUserId: profileId });
      setRelation('outgoing');
      toast({ title: 'Success', description: 'Follow request sent' });
      await loadRelation();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed to follow', variant: 'destructive' });
    } finally {
      setWorking(false);
    }
  };

  const doUnfollowOrCancel = async () => {
    if (!currentUser?.id || !profileId || working) return;
    setWorking(true);
    try {
      await friendshipAPI.cancelFollow(profileId);
      setRelation('none');
      toast({ title: 'Success', description: relation === 'accepted' ? 'Unfollowed' : 'Request canceled' });
      await loadRelation();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed to update follow', variant: 'destructive' });
    } finally {
      setWorking(false);
    }
  };

  const doAccept = async () => {
    if (!friendshipId || working) return;
    setWorking(true);
    try {
      await friendshipAPI.accept(friendshipId);
      setRelation('accepted');
      toast({ title: 'Accepted', description: 'You are now connected' });
      await loadRelation();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed to accept', variant: 'destructive' });
    } finally {
      setWorking(false);
    }
  };

  const doReject = async () => {
    if (!friendshipId || working) return;
    setWorking(true);
    try {
      await friendshipAPI.reject(friendshipId);
      setRelation('none');
      toast({ title: 'Rejected', description: 'Request removed' });
      await loadRelation();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed to reject', variant: 'destructive' });
    } finally {
      setWorking(false);
    }
  };

  const content = useMemo(() => {
    if (loading) {
      return (
        <Card className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </Card>
      );
    }

    if (!profileData) {
      return (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Profile not found</p>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Cột trái: Avatar + nút overlay */}
              <div className="relative w-24">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profileData.avatarUrl ?? undefined} alt={profileData.fullName ?? "Avatar"} />
                  <AvatarFallback className="text-2xl">
                    {profileData.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>

                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => setAvatarDialogOpen(true)}
                    aria-label="Change avatar">
                  </button>
                )}
              </div>

              {/* Cột phải: Thông tin + action buttons */}
              <div className="flex-1 space-y-3">
                <div className="space-y-1">
                  {primaryBadge && (
                    <div>
                      <UserBadge badge={primaryBadge} size="md" />
                    </div>
                  )}
                  <h1 className="text-2xl font-bold">{profileData.fullName}</h1>
                  <p className="text-muted-foreground">{profileData.email}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge>{profileData.role}</Badge>
                  <Badge variant="outline">
                    <Award className="mr-1 h-3 w-3" />
                    {profileData.point ?? 0} reputation
                  </Badge>
                  {(profileData as any).field_of_study || (profileData as any).major ? (
                    <Badge variant="secondary">
                      {(profileData as any).field_of_study || (profileData as any).major}
                    </Badge>
                  ) : null}
                </div>

                {profileData.bio && (
                  <p className="text-sm text-muted-foreground">{profileData.bio}</p>
                )}

                {/* ===== NEW: Hàng nút hành động theo quan hệ */}
                <div className="flex flex-wrap gap-2">
                  {isOwnProfile ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setAvatarDialogOpen(true)}>
                        Change Avatar
                      </Button>

                      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">Edit Profile</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-l md:max-w-2xl lg:max-w-3xl">
                          <DialogHeader className="space-y-3 text-left">
                            <DialogTitle>Edit Profile</DialogTitle>
                            <DialogDescription>
                              Update your avatar and personal information.
                            </DialogDescription>
                            <p className="text-sm text-muted-foreground">
                              Keep your details fresh so classmates know how to reach and collaborate with you.
                            </p>
                          </DialogHeader>

                          <form
                            id="edit-profile-form"
                            className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                            onSubmit={handleEditSubmit}
                          >
                            <div className="space-y-2 md:col-span-2 lg:col-span-3">
                              <Label
                                htmlFor="email"
                                className="flex items-center gap-2 text-sm font-medium"
                              >
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                Email
                              </Label>
                              <Input id="email" value={formState.email} disabled readOnly />
                            </div>

                            <div className="space-y-2">
                              <Label
                                htmlFor="username"
                                className="flex items-center gap-2 text-sm font-medium"
                              >
                                <User className="h-4 w-4 text-muted-foreground" />
                                Username
                              </Label>
                              <Input
                                id="username"
                                value={formState.username}
                                onChange={(e) =>
                                  setFormState((p) => ({ ...p, username: e.target.value }))
                                }
                                disabled={saving}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label
                                htmlFor="full_name"
                                className="flex items-center gap-2 text-sm font-medium"
                              >
                                <Users className="h-4 w-4 text-muted-foreground" />
                                Full Name
                              </Label>
                              <Input
                                id="full_name"
                                value={formState.full_name}
                                onChange={(e) =>
                                  setFormState((p) => ({ ...p, full_name: e.target.value }))
                                }
                                disabled={saving}
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label
                                htmlFor="phone_number"
                                className="flex items-center gap-2 text-sm font-medium"
                              >
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                Phone Number
                              </Label>
                              <Input
                                id="phone_number"
                                value={formState.phone_number}
                                onChange={(e) =>
                                  setFormState((p) => ({ ...p, phone_number: e.target.value }))
                                }
                                disabled={saving}
                                placeholder="+1234567890"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label
                                htmlFor="field_of_study"
                                className="flex items-center gap-2 text-sm font-medium"
                              >
                                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                Major
                              </Label>
                              <Input
                                id="field_of_study"
                                value={formState.field_of_study}
                                onChange={(e) =>
                                  setFormState((p) => ({ ...p, field_of_study: e.target.value }))
                                }
                                disabled={saving}
                                placeholder="e.g. Computer Science"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label
                                htmlFor="faculty"
                                className="flex items-center gap-2 text-sm font-medium"
                              >
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                Faculty
                              </Label>
                              <Input
                                id="faculty"
                                value={formState.faculty}
                                onChange={(e) =>
                                  setFormState((p) => ({ ...p, faculty: e.target.value }))
                                }
                                disabled={saving}
                                placeholder="e.g. Engineering"
                              />
                            </div>

                            <div className="space-y-2 md:col-span-2 lg:col-span-3">
                              <Label
                                htmlFor="bio"
                                className="flex items-center gap-2 text-sm font-medium"
                              >
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                Bio
                              </Label>
                              <Textarea
                                id="bio"
                                value={formState.bio}
                                onChange={(e) =>
                                  setFormState((p) => ({ ...p, bio: e.target.value }))
                                }
                                disabled={saving}
                                rows={4}
                                placeholder="Tell the community a little about yourself"
                              />
                            </div>
                          </form>

                          <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsEditOpen(false)}
                              disabled={saving}
                            >
                              Cancel
                            </Button>
                            <Button type="submit" form="edit-profile-form" disabled={saving}>
                              {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </>
                  ) : (
                    <>
                      {relation === 'accepted' && (
                        <>
                          <Button size="sm" variant="ghost" onClick={doUnfollowOrCancel} disabled={working}>
                            <X className="mr-2 h-4 w-4" />
                            Unfollow
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleMessage}>
                            <Mail className="mr-2 h-4 w-4" />
                            Message
                          </Button>
                        </>
                      )}

                      {relation === 'outgoing' && (
                        <Button size="sm" variant="ghost" onClick={doUnfollowOrCancel} disabled={working}>
                          <X className="mr-2 h-4 w-4" />
                          Cancel request
                        </Button>
                      )}

                      {relation === 'incoming' && (
                        <>
                          <Button size="sm" onClick={doAccept} disabled={working}>
                            <Check className="mr-2 h-4 w-4" />
                            Accept
                          </Button>
                          <Button size="sm" variant="ghost" onClick={doReject} disabled={working}>
                            <X className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </>
                      )}

                      {relation === 'none' && (
                        <Button size="sm" onClick={doFollow} disabled={working}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Follow
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Posts</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.postsCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comments</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.commentsCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Likes Received</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.likesReceived}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4 mt-6">
            {posts.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  No posts yet {/* hoặc nạp posts bằng postAPI khi sẵn sàng */}
                </p>
              </Card>
            ) : (
              posts.map((p) => <PostCard key={p.id} post={p} />)
            )}
          </TabsContent>

          <TabsContent value="comments" className="mt-6">
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Comments coming soon</p>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Activity feed coming soon</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }, [
    loading,
    profileData,
    stats,
    posts,
    isOwnProfile,
    isEditOpen,
    formState,
    saving,
    handleEditSubmit,
    primaryBadge,
    relation,
    working,
  ]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-6xl mx-auto w-full">{content}</main>
      </div>

      <AvatarCropDialog
        open={avatarDialogOpen}
        onOpenChange={setAvatarDialogOpen}
        onUploaded={handleAvatarUploaded}
      />
    </div>
  );
}

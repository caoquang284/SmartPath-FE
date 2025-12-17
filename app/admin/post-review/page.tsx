'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

import { postAPI } from '@/lib/api/postAPI';
import type { PostResponseDto } from '@/lib/types';
import { mapPostToUI } from '@/lib/mappers/postMapper';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, XCircle, Clock, Eye, ArrowLeft, AlertTriangle } from 'lucide-react';
import { PostStatusBadge } from '@/components/forum/PostStatusBadge';

type PostStatus = 'Accepted' | 'Pending' | 'Rejected';

export default function PostReviewPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [posts, setPosts] = useState<(PostResponseDto & { ui: ReturnType<typeof mapPostToUI> })[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPost, setUpdatingPost] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostResponseDto | null>(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<PostStatus>('Accepted');
  const [adminNote, setAdminNote] = useState('');

  // Check if user is admin
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'Only administrators can access this page.',
        variant: 'destructive'
      });
      router.push('/dashboard');
    }
  }, [profile, router, toast]);

  const loadPendingPosts = async () => {
    setLoading(true);
    try {
      // Fetch all posts (include all statuses) for admin review
      const result = await postAPI.getAll({ page: 1, pageSize: 100, includeAll: true });
      const allPosts = result.items.filter(post =>
        post.status === 'Pending' || post.status === 'Rejected'
      );

      const postsWithUI = allPosts.map(post => ({
        ...post,
        ui: mapPostToUI(post)
      }));

      setPosts(postsWithUI);
    } catch (error) {
      console.error('Failed to load posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load posts for review.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadPendingPosts();
    }
  }, [profile]);

  const handleUpdateStatus = async () => {
    if (!selectedPost) return;

    setUpdatingPost(selectedPost.id);
    try {
      // Use the admin API to update post status
      await postAPI.updateStatus(selectedPost.id, newStatus, adminNote || undefined);

      // Update local state
      setPosts(prev => prev.map(post =>
        post.id === selectedPost.id
          ? { ...post, status: newStatus }
          : post
      ));

      toast({
        title: 'Success',
        description: `Post status updated to ${newStatus}.`,
      });

      setReviewDialog(false);
      setSelectedPost(null);
      setAdminNote('');
    } catch (error) {
      console.error('Failed to update post status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update post status.',
        variant: 'destructive'
      });
    } finally {
      setUpdatingPost(null);
    }
  };

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading posts for review...</div>
      </div>
    );
  }

  const pendingPosts = posts.filter(post => post.status === 'Pending');
  const rejectedPosts = posts.filter(post => post.status === 'Rejected');

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Post Review</h1>
          <p className="text-muted-foreground">Review and moderate posts submitted by users</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPosts.length}</div>
            <p className="text-xs text-muted-foreground">
              Posts awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedPosts.length}</div>
            <p className="text-xs text-muted-foreground">
              Posts rejected by AI
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Review Queue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{posts.length}</div>
            <p className="text-xs text-muted-foreground">
              Total posts needing attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Posts */}
      {pendingPosts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Pending Posts ({pendingPosts.length})</h2>
          <div className="grid gap-4">
            {pendingPosts.map((post) => (
              <Card key={post.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <PostStatusBadge
                        status={post.status}
                        rejectReason={post.rejectReason}
                        aiReason={post.aiReason}
                      />
                      <span className="text-sm text-muted-foreground">
                        by {post.authorUsername} • {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
                    <p className="text-muted-foreground line-clamp-3">{post.content}</p>
                    {post.aiConfidence && (
                      <p className="text-sm text-muted-foreground mt-2">
                        AI Confidence: {Math.round(post.aiConfidence * 100)}%
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/forum/${post.id}`, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedPost(post);
                        setReviewDialog(true);
                        setNewStatus('Accepted');
                      }}
                    >
                      Review
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Rejected Posts */}
      {rejectedPosts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Rejected Posts ({rejectedPosts.length})</h2>
          <div className="grid gap-4">
            {rejectedPosts.map((post) => (
              <Card key={post.id} className="p-6 border-red-200">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <PostStatusBadge
                        status={post.status}
                        rejectReason={post.rejectReason}
                        aiReason={post.aiReason}
                      />
                      <span className="text-sm text-muted-foreground">
                        by {post.authorUsername} • {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
                    <p className="text-muted-foreground line-clamp-3 mb-2">{post.content}</p>
                    {post.rejectReason && (
                      <div className="bg-red-50 p-3 rounded-md">
                        <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                        <p className="text-sm text-red-600">{post.rejectReason}</p>
                      </div>
                    )}
                    {post.aiConfidence && (
                      <p className="text-sm text-muted-foreground mt-2">
                        AI Confidence: {Math.round(post.aiConfidence * 100)}%
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/forum/${post.id}`, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedPost(post);
                        setReviewDialog(true);
                        setNewStatus('Accepted');
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {posts.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground">No posts currently need review.</p>
          </CardContent>
        </Card>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Post</DialogTitle>
            <DialogDescription>
              Review and update the status of this post.
            </DialogDescription>
          </DialogHeader>

          {selectedPost && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Title</Label>
                <p className="mt-1 text-sm">{selectedPost.title}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Content</Label>
                <p className="mt-1 text-sm line-clamp-4">{selectedPost.content}</p>
              </div>

              {selectedPost.aiReason && (
                <div>
                  <Label className="text-sm font-medium">AI Review</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedPost.aiReason}</p>
                </div>
              )}

              <div>
                <Label htmlFor="status">New Status</Label>
                <Select value={newStatus} onValueChange={(value: PostStatus) => setNewStatus(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Accepted">Accepted</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(newStatus === 'Rejected' || newStatus === 'Pending') && (
                <div>
                  <Label htmlFor="adminNote">Admin Note (Optional)</Label>
                  <Textarea
                    id="adminNote"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Add a note for the author..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialog(false)}
              disabled={updatingPost !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updatingPost !== null}
            >
              {updatingPost === selectedPost?.id ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
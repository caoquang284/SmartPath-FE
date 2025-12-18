'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { postAPI } from '@/lib/api/postAPI';
import type { PostResponseDto } from '@/lib/types';
import { mapPostToUI, type UIPost } from '@/lib/mappers/postMapper';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { formatDistanceToNow } from 'date-fns';
import {
  XCircle,
  AlertCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  ArrowLeft,
  RefreshCw,
  Info,
  Lightbulb,
  CheckCircle
} from 'lucide-react';
import { PostStatusBadge } from '@/components/forum/PostStatusBadge';

export default function RejectedPostsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<UIPost[]>([]);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);

  // Check if user is logged in
  useEffect(() => {
    if (!profile) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to view your rejected posts.',
        variant: 'destructive'
      });
      router.push('/auth/login');
      return;
    }
  }, [profile, router, toast]);

  const loadRejectedPosts = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      // Fetch all posts by user and filter for rejected ones
      const result = await postAPI.getByUser(profile.id);
      const rejectedPosts = result.items.filter(post => post.status === 'Rejected');

      const mappedPosts = rejectedPosts.map(mapPostToUI);
      setPosts(mappedPosts);
    } catch (error) {
      console.error('Failed to load rejected posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load rejected posts.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      loadRejectedPosts();
    }
  }, [profile?.id]);

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    setDeletingPost(postId);
    try {
      await postAPI.delete(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast({
        title: 'Success',
        description: 'Post deleted successfully.',
      });
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete post.',
        variant: 'destructive'
      });
    } finally {
      setDeletingPost(null);
    }
  };

  const handleEditPost = (postId: string) => {
    // Redirect to edit page or open edit modal
    router.push(`/forum/${postId}?edit=true`);
  };

  const getConfidenceColor = (confidence?: number | null) => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 0.7) return 'text-green-600';
    if (confidence >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!profile) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/forum">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <XCircle className="h-8 w-8 text-red-500" />
            Rejected Posts
          </h1>
          <p className="text-muted-foreground">
            Posts that were not approved by our AI content moderator
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadRejectedPosts}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Info Card */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Why was my post rejected?</strong><br />
          Our AI moderator reviews posts for content quality, relevance, and appropriateness.
          Posts may be rejected if they contain spam, inappropriate content, or don't match the selected categories.
          You can edit and resubmit posts that need improvement.
        </AlertDescription>
      </Alert>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading rejected posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Rejected Posts</h3>
            <p className="text-muted-foreground mb-4">
              Great! None of your posts have been rejected. Keep up the good work!
            </p>
            <Link href="/forum/create">
              <Button>
                Create a Post
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {posts.length} rejected {posts.length === 1 ? 'post' : 'posts'}
            </p>
          </div>

          {posts.map((post) => (
            <Card key={post.id} className="border-red-200">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <PostStatusBadge
                        status={post.status}
                        rejectReason={post.rejectReason}
                        aiReason={post.aiReason}
                      />
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <Link href={`/forum/${post.id}`}>
                      <h3 className="text-lg font-semibold hover:text-blue-600 transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                    </Link>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/forum/${post.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPost(post.id)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePost(post.id)}
                      disabled={deletingPost === post.id}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deletingPost === post.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Post Content Preview */}
                <div>
                  <h4 className="font-medium mb-2">Content Preview:</h4>
                  <p className="text-sm text-muted-foreground line-clamp-3 bg-gray-50 p-3 rounded">
                    {post.content}
                  </p>
                </div>

                <Separator />

                {/* AI Review Details */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    AI Review Details
                  </h4>

                  {post.aiConfidence !== undefined && post.aiConfidence !== null && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">AI Confidence:</span>
                      <span className={`font-bold ${getConfidenceColor(post.aiConfidence)}`}>
                        {Math.round(post.aiConfidence * 100)}%
                      </span>
                      {post.aiConfidence < 0.4 && (
                        <Badge variant="destructive" className="text-xs">
                          Low Confidence
                        </Badge>
                      )}
                      {post.aiConfidence >= 0.4 && post.aiConfidence < 0.7 && (
                        <Badge variant="secondary" className="text-xs">
                          Medium Confidence
                        </Badge>
                      )}
                    </div>
                  )}

                  {post.aiCategoryMatch !== undefined && post.aiCategoryMatch !== null && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Category Match:</span>
                      <Badge variant={post.aiCategoryMatch ? "default" : "destructive"} className="text-xs">
                        {post.aiCategoryMatch ? "Good Match" : "Poor Match"}
                      </Badge>
                    </div>
                  )}

                  {post.aiReason && (
                    <div>
                      <span className="font-medium text-sm">AI Reasoning:</span>
                      <div className="mt-1 p-3 bg-blue-50 rounded-md text-sm">
                        {post.aiReason}
                      </div>
                    </div>
                  )}

                  {post.rejectReason && (
                    <div>
                      <span className="font-medium text-sm flex items-center gap-1">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Rejection Reason:
                      </span>
                      <div className="mt-1 p-3 bg-red-50 rounded-md text-sm text-red-800">
                        {post.rejectReason}
                      </div>
                    </div>
                  )}

                  {post.reviewedAt && (
                    <div className="text-xs text-muted-foreground">
                      Reviewed {formatDistanceToNow(new Date(post.reviewedAt), { addSuffix: true })}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Improvement Suggestions */}
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Suggestions for improvement:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      {post.aiCategoryMatch === false && (
                        <li>Ensure your post content matches the selected categories</li>
                      )}
                      {post.aiConfidence !== null && post.aiConfidence !== undefined && post.aiConfidence < 0.7 && (
                        <li>Make your post more detailed and specific</li>
                      )}
                      <li>Check for spam or repetitive content</li>
                      <li>Ensure the content is appropriate and helpful</li>
                      <li>Use clear formatting and proper grammar</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
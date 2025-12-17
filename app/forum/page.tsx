'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

import { postAPI } from '@/lib/api/postAPI';
import { reactionAPI } from '@/lib/api/reactionAPI';

import type { PostResponseDto } from '@/lib/types';
import { mapPostToUI, type UIPost } from '@/lib/mappers/postMapper';

import { PostCard } from '@/components/forum/PostCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { PlusCircle, Search, Clock, Filter } from 'lucide-react';

type PostFetchStrategy = 'all' | 'byUser' | 'recommended';

const FETCH_STRATEGIES: Record<
  PostFetchStrategy,
  (args?: {
    userId?: string;
    page?: number;
    pageSize?: number;
    includeAll?: boolean;
    isAdmin?: boolean;
    searchQuery?: string;
  }) => Promise<{ items: PostResponseDto[]; total: number }>
> = {
  all: async (args = {}) => {
    const { page = 1, pageSize = 20, includeAll, isAdmin, searchQuery } = args;
    const result = await postAPI.getAll({
      page,
      pageSize,
      includeAll: includeAll || isAdmin,
      // Note: Backend would need to support search parameter
    });
    return { items: result.items, total: result.total };
  },
  byUser: async (args = {}) => {
    const userId = args.userId;
    const { page = 1, pageSize = 20, includeAll, isAdmin, searchQuery } = args;
    if (!userId) return { items: [], total: 0 };
    const result = await postAPI.getByUser(userId, { page, pageSize });
    return { items: result.items, total: result.total };
  },
  recommended: async (args = {}) => {
    const { includeAll, isAdmin, searchQuery } = args;
    // Only get accepted posts for regular users, admins can see all
    const status = (includeAll || isAdmin) ? undefined : 'Accepted';
    const items = await postAPI.getRecommendations(undefined, status);

    // If there's a search query, filter the results on client side
    // (this is temporary until backend supports search)
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const filteredItems = items.filter(post =>
        post.title.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q)
      );
      return { items: filteredItems, total: filteredItems.length };
    }

    return { items, total: items.length };
  },
};

export default function ForumPage() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const isGuest = !profile?.id;
  const isAdmin = profile?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [rawPosts, setRawPosts] = useState<PostResponseDto[]>([]);
  const [searchInput, setSearchInput] = useState(''); // What user types
  const [activeSearchQuery, setActiveSearchQuery] = useState(''); // What's actually applied
  const [strategy, setStrategy] = useState<PostFetchStrategy>('recommended');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize] = useState(20);

  const fetchPosts = useCallback(async (page = currentPage, search = activeSearchQuery) => {
    setLoading(true);
    try {
      const { items, total } = await FETCH_STRATEGIES[strategy]({
        userId: profile?.id,
        page,
        pageSize,
        includeAll: isAdmin, // Admins can see all statuses
        isAdmin, // Pass admin flag to strategies
        searchQuery: search
      });

      const sorted = [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRawPosts(sorted);
      setTotalItems(total);
    } catch (error) {
      console.error('Failed to load posts:', error);
      toast({ title: 'Error', description: 'Failed to load posts', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [strategy, profile?.id, isAdmin, toast, activeSearchQuery]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Reset to first page when strategy changes
  useEffect(() => {
    setCurrentPage(1);
    fetchPosts(1);
  }, [strategy]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchPosts(page);
  };

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1);
    setActiveSearchQuery(searchInput); // Apply the search input as active search
    fetchPosts(1, searchInput);
  };

  const uiPosts: UIPost[] = useMemo(() => rawPosts.map(mapPostToUI), [rawPosts]);

  type ReactionKind = 'like' | 'dislike';

  const mutateLocal = (postId: string, updater: (p: PostResponseDto) => PostResponseDto) => {
    setRawPosts((cur) => cur.map((p) => (p.id === postId ? updater(p) : p)));
  };

  const handleReact = async (postId: string, kind: ReactionKind) => {
    if (isGuest) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to react.',
        variant: 'destructive',
      });
      return;
    }

    const target = rawPosts.find((p) => p.id === postId);
    if (!target) return;

    const currPos = !!target.isPositiveReacted;
    const currNeg = !!target.isNegativeReacted;
    const wantPos = kind === 'like';
    const wantNeg = kind === 'dislike';

    type Action = 'clear' | 'set-like' | 'set-dislike';
    let action: Action;

    if ((currPos && wantPos) || (currNeg && wantNeg)) {
      action = 'clear';
    } else if (wantPos) {
      action = 'set-like';
    } else {
      action = 'set-dislike';
    }

    const prev = { ...target };

    mutateLocal(postId, (p) => {
      let pos = p.positiveReactionCount ?? 0;
      let neg = p.negativeReactionCount ?? 0;
      let isPos: boolean | null = p.isPositiveReacted;
      let isNeg: boolean | null = p.isNegativeReacted;

      if (action === 'clear') {
        if (isPos) {
          pos = Math.max(0, pos - 1);
          isPos = null;
        } else if (isNeg) {
          neg = Math.max(0, neg - 1);
          isNeg = null;
        }
      } else if (action === 'set-like') {
        if (isNeg) {
          neg = Math.max(0, neg - 1);
          pos = pos + 1;
        } else if (!isPos) {
          pos = pos + 1;
        }
        isPos = true;
        isNeg = false;
      } else if (action === 'set-dislike') {
        if (isPos) {
          pos = Math.max(0, pos - 1);
          neg = neg + 1;
        } else if (!isNeg) {
          neg = neg + 1;
        }
        isPos = false;
        isNeg = true;
      }

      return {
        ...p,
        isPositiveReacted: isPos,
        isNegativeReacted: isNeg,
        positiveReactionCount: pos,
        negativeReactionCount: neg,
      };
    });

    try {
      if (action === 'clear') {
        await reactionAPI.removePost(postId);
        toast({ title: 'Success', description: 'Reaction cleared' });
      } else if (action === 'set-like') {
        await reactionAPI.react({ postId, isPositive: true });
        toast({ title: 'Success', description: 'Liked post' });
      } else {
        await reactionAPI.react({ postId, isPositive: false });
        toast({ title: 'Success', description: 'Disliked post' });
      }
    } catch (e) {
      mutateLocal(postId, () => prev);
      console.error(e);
      toast({ title: 'Error', description: 'Failed to update reaction', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t.forum.title}</h1>
          <p className="text-muted-foreground">
            {t.forum.subtitle} {isGuest && `(${t.forum.guest})`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isGuest ? (
            <Link href="/auth/login">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t.forum.signInToPost}
              </Button>
            </Link>
          ) : (
            <Link href="/forum/create">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                  {t.forum.createPost}
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4 mt-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">{t.forum.loadingPosts}</p>
          </div>
        ) : uiPosts.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">{t.forum.noPostsFound}</p>
            {!isGuest && (
              <Link href="/forum/create">
                <Button className="mt-4">{t.forum.createFirstPost}</Button>
              </Link>
            )}
          </Card>
        ) : (
          filteredPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <PostCard
                post={post}
                canReact={!isGuest}
                signInHint={isGuest ? t.forum.signInToReact : undefined}
                onLike={() => handleReact(post.id, 'like')}
                onDislike={() => handleReact(post.id, 'dislike')}
                isLiked={post.isPositiveReacted === true}
                isDisliked={post.isNegativeReacted === true}
              />
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {strategy !== 'recommended' && (
        <div className="flex justify-center mt-6">
          <PaginationControls
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / pageSize)}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Results info */}
      {!loading && strategy !== 'recommended' && (
        <div className="text-center text-sm text-muted-foreground">
          {t.forum.showing} {filteredPosts.length} {t.forum.of} {totalItems} {t.forum.posts}
        </div>
      )}
    </div>
  );
}

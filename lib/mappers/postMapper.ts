import type { PostResponseDto } from '@/lib/types';

export type UIPost = {
  id: string;
  author_id: string;
  title: string;
  content: string;
  is_question: boolean;
  created_at: string;
  updated_at: string | null;

  author: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    reputation_points: number;
    primaryBadge: { id: string; name: string; point: number } | null;
  };

  comments_count: number;
  tags: Array<{ id: string; name: string; color?: string }>;
  isPositiveReacted: boolean | null;
  isNegativeReacted: boolean | null;
  positiveReactionCount: number;
  negativeReactionCount: number;
  // AI Review fields
  status: 'Accepted' | 'Pending' | 'Rejected';
  rejectReason?: string | null;
  aiConfidence?: number | null;
  aiCategoryMatch?: boolean | null;
  aiReason?: string | null;
  reviewedAt?: string | null;
};

export function mapPostToUI(p: PostResponseDto): UIPost {
  return {
    id: p.id,
    author_id: p.authorId,
    title: p.title,
    content: p.content,
    is_question: p.isQuestion,
    created_at: p.createdAt,
    updated_at: p.updatedAt ?? null,

    author: {
      id: p.authorId,
      full_name: p.authorUsername ?? 'Unknown',
      avatar_url: p.authorAvatarUrl ?? null,
      reputation_points: p.authorPoint,
      primaryBadge: null,
    },

    comments_count: p.commentCount,
    tags: (p.categories ?? []).map((name) => ({ id: name, name })),
    isPositiveReacted: p.isPositiveReacted,
    isNegativeReacted: p.isNegativeReacted,
    positiveReactionCount: p.positiveReactionCount,
    negativeReactionCount: p.negativeReactionCount,
    // AI Review fields
    status: p.status,
    rejectReason: p.rejectReason,
    aiConfidence: p.aiConfidence,
    aiCategoryMatch: p.aiCategoryMatch,
    aiReason: p.aiReason,
    reviewedAt: p.reviewedAt
  };
}

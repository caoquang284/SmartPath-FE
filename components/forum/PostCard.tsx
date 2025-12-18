'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageSquare, Pin, ThumbsDown, Clock, XCircle, CheckCircle, AlertCircle, MoreVertical, Flag } from 'lucide-react';
import type { UIPost } from '@/lib/mappers/postMapper';
import { useBadgesCatalog, pickPrimaryBadgeByPoints } from '@/hooks/use-badge-catalog';
import { BadgePillFancy } from './BadgePillFancy';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReportDialog } from '@/components/report/ReportDialog';

interface PostCardProps {
  post: UIPost & {
    views?: number;
    is_pinned?: boolean;
  };
  onLike?: () => void;
  onDislike?: () => void;
  isLiked?: boolean;
  isDisliked?: boolean;
  canReact?: boolean;       
  signInHint?: string;
}

export function PostCard({
  post,
  onLike,
  onDislike,
  isLiked,
  isDisliked,
  canReact=true,
  signInHint,
}: PostCardProps) {
  const { profile } = useAuth();
  const { locale } = useLanguage();
  const liked = typeof isLiked === 'boolean' ? isLiked : post.isPositiveReacted === true;
  const disliked = typeof isDisliked === 'boolean' ? isDisliked : post.isNegativeReacted === true;

  const badges = useBadgesCatalog();
  const primaryBadge =
    post.author.primaryBadge ??
    pickPrimaryBadgeByPoints(badges, post.author.reputation_points);

  const reactTitle = !canReact ? (signInHint ?? 'Đăng nhập để đánh giá') : undefined;

  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author.avatar_url ?? undefined} alt={post.author.full_name} />
              <AvatarFallback>{post.author.full_name?.charAt(0)?.toUpperCase()}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Link
                  href={`/profile/${post.author.id}`}
                  className="font-medium hover:underline truncate"
                >
                  {post.author.full_name}
                </Link>
                {/* HIỂN THỊ BADGE CỦA TÁC GIẢ — thay cho reputation points */}
                <BadgePillFancy badge={primaryBadge} />
                </div>

              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: locale === 'vi' ? vi : enUS })}
                </p>
                {post.reviewedAt && (
                  <p className="text-xs text-muted-foreground">
                    • Reviewed {formatDistanceToNow(new Date(post.reviewedAt), { addSuffix: true, locale: locale === 'vi' ? vi : enUS })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {post.is_pinned && <Pin className="h-4 w-4 text-blue-600 flex-shrink-0" />}
          
          {canReact && (
            <ReportDialog
              type="post"
              id={post.id}
              trigger={
                <button className="text-muted-foreground hover:text-foreground">
                  <Flag className="h-4 w-4" />
                </button>
              }
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <Link href={`/forum/${post.id}`}>
          <h3 className="text-lg font-semibold hover:text-blue-600 transition-colors line-clamp-2">
            {post.title}
          </h3>
        </Link>

        <p className="text-sm text-muted-foreground line-clamp-3">
          {post.content}
        </p>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                style={{ borderColor: tag.color, color: tag.color }}
                className="text-xs"
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 pt-2">
          {/* LIKE */}
          <button
            onClick={onLike}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-500 transition-colors"
            title={reactTitle}
            disabled={!canReact}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
            <span>{post.positiveReactionCount}</span>
          </button>

          {/* DISLIKE */}
          <button
            onClick={onDislike}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-blue-500 transition-colors"
            title={reactTitle}
            disabled={!canReact}
            aria-label={disliked ? 'Clear dislike' : 'Dislike'}
          >
            <ThumbsDown className={`h-4 w-4 ${disliked ? 'fill-blue-500 text-blue-500' : ''}`} />
            <span>{post.negativeReactionCount}</span>
          </button>

          {/* COMMENTS */}
          <Link
            href={`/forum/${post.id}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-blue-500 transition-colors"
            title="Comments"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{post.comments_count}</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

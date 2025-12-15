'use client';

import { useState, useEffect } from 'react';
import { studyMaterialAPI } from '@/lib/api/studyMaterialAPI';
import { StudyMaterialRatingResponse } from '@/lib/types';
import { StarRating } from './StarRating';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface RatingListProps {
  materialId: string;
  showLoadMore?: boolean;
  pageSize?: number;
}

export function RatingList({ materialId, showLoadMore = true, pageSize = 5 }: RatingListProps) {
  const [ratings, setRatings] = useState<StudyMaterialRatingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchRatings = async (pageNum: number, append = false) => {
    try {
      const response = await studyMaterialAPI.ratings.getAll(materialId, {
        page: pageNum,
        pageSize,
      });

      const items = response.items || [];
      const total = response.total || 0;

      if (append) {
        setRatings(prev => [...prev, ...items]);
      } else {
        setRatings(items);
      }

      setTotalCount(total);
      setHasMore(items.length + ((pageNum - 1) * pageSize) < total);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch ratings:', error);
      // Set empty state on error
      if (!append) {
        setRatings([]);
        setTotalCount(0);
        setHasMore(false);
      }
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchRatings(1);
  }, [materialId]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    await fetchRatings(page + 1, true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Đánh giá
        </h3>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!ratings || ratings.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Chưa có đánh giá nào</h3>
        <p className="text-muted-foreground">
          Hãy là người đầu tiên đánh giá tài liệu này
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Đánh giá ({totalCount})
        </h3>
      </div>

      <div className="space-y-4">
        {ratings.map((rating) => (
          <Card key={rating.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={rating.user.avatarUrl || undefined} />
                  <AvatarFallback>
                    {rating.user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{rating.user.fullName}</p>
                      <p className="text-sm text-muted-foreground">@{rating.user.username}</p>
                    </div>
                    <div className="text-right">
                      <StarRating rating={rating.rating} readonly showValue={false} size="sm" />
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(rating.createdAt), {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </p>
                    </div>
                  </div>

                  {rating.comment && (
                    <div className="bg-muted/50 p-3 rounded-md">
                      <p className="text-sm">{rating.comment}</p>
                    </div>
                  )}

                  {rating.updatedAt !== rating.createdAt && (
                    <p className="text-xs text-muted-foreground italic">
                      Đã chỉnh sửa: {formatDistanceToNow(new Date(rating.updatedAt), {
                        addSuffix: true,
                        locale: vi,
                      })}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showLoadMore && hasMore && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Đang tải...' : 'Xem thêm đánh giá'}
          </Button>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { studyMaterialAPI } from '@/lib/api/studyMaterialAPI';
import { StudyMaterialRatingStats } from '@/lib/types';
import { StarRating } from './StarRating';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, BarChart3 } from 'lucide-react';

interface RatingDisplayProps {
  materialId: string;
  showDistribution?: boolean;
}

export function RatingDisplay({ materialId, showDistribution = true }: RatingDisplayProps) {
  const [stats, setStats] = useState<StudyMaterialRatingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await studyMaterialAPI.ratings.getStats(materialId);
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch rating stats:', error);
        // Set default empty stats on error
        setStats({
          averageRating: 0,
          totalRatings: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [materialId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            {showDistribution && (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <div key={star} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-2 w-32" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const getPercentage = (count: number) => {
    if (stats.totalRatings === 0) return 0;
    return Math.round((count / stats.totalRatings) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Đánh giá
        </CardTitle>
        <CardDescription>
          {stats.totalRatings > 0
            ? `${stats.totalRatings} người đã đánh giá`
            : 'Chưa có đánh giá nào'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Average Rating */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'}
            </div>
            <StarRating
              rating={stats.averageRating}
              readonly
              showValue={false}
              size="sm"
            />
          </div>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-1">
              {stats.totalRatings > 0 ? 'Trung bình' : 'Chưa có đánh giá'}
            </div>
            <div className="text-2xl font-semibold">
              {stats.totalRatings > 0
                ? `${stats.totalRatings} đánh giá`
                : 'Hãy là người đầu tiên đánh giá'
              }
            </div>
          </div>
        </div>

        {/* Rating Distribution */}
        {showDistribution && stats.totalRatings > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <BarChart3 className="h-4 w-4" />
              Phân bố đánh giá
            </div>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.ratingDistribution[star as keyof typeof stats.ratingDistribution];
              const percentage = getPercentage(count);

              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-sm w-8 text-right">{star}</span>
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm w-12 text-right">{count}</span>
                  <span className="text-sm w-12 text-right text-muted-foreground">
                    {percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
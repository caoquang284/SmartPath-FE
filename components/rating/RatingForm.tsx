'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { studyMaterialAPI } from '@/lib/api/studyMaterialAPI';
import { StudyMaterialRatingRequest, StudyMaterialRatingResponse } from '@/lib/types';
import { StarRating } from './StarRating';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Star, Trash2 } from 'lucide-react';

interface RatingFormProps {
  materialId: string;
  materialTitle: string;
  onRatingUpdate?: () => void;
}

export function RatingForm({ materialId, materialTitle, onRatingUpdate }: RatingFormProps) {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [userRating, setUserRating] = useState<StudyMaterialRatingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<StudyMaterialRatingRequest>({
    rating: 0,
    comment: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  // Fetch user's current rating
  useEffect(() => {
    const fetchUserRating = async () => {
      if (!profile) {
        setLoading(false);
        return;
      }

      try {
        const rating = await studyMaterialAPI.ratings.getMyRating(materialId);
        setUserRating(rating);
        if (rating) {
          setFormData({
            rating: rating.rating,
            comment: rating.comment || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch user rating:', error);
        // Don't show error toast on 404 (user hasn't rated yet)
        if (error && typeof error === 'object' && 'code' in error && error.code !== 404) {
          // Only log unexpected errors, user not having rated yet is normal
          console.warn('Unexpected error fetching user rating:', error);
        }
        // Clear any existing rating on error
        setUserRating(null);
        setFormData({
          rating: 0,
          comment: '',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserRating();
  }, [materialId, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      toast({
        title: 'Yêu cầu đăng nhập',
        description: 'Bạn cần đăng nhập để đánh giá tài liệu',
        variant: 'destructive',
      });
      return;
    }

    if (formData.rating === 0) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn số sao đánh giá',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      await studyMaterialAPI.ratings.rate(materialId, formData);

      toast({
        title: 'Thành công',
        description: userRating ? 'Cập nhật đánh giá thành công' : 'Đánh giá của bạn đã được gửi',
      });

      // Fetch updated rating
      const updatedRating = await studyMaterialAPI.ratings.getMyRating(materialId);
      setUserRating(updatedRating);
      setIsEditing(false);
      onRatingUpdate?.();

    } catch (error: any) {
      console.error('Failed to submit rating:', error);
      toast({
        title: 'Lỗi',
        description: error.error || 'Không thể gửi đánh giá. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!profile || !userRating) return;

    try {
      await studyMaterialAPI.ratings.delete(materialId);

      toast({
        title: 'Thành công',
        description: 'Đã xóa đánh giá của bạn',
      });

      setUserRating(null);
      setFormData({ rating: 0, comment: '' });
      onRatingUpdate?.();

    } catch (error: any) {
      console.error('Failed to delete rating:', error);
      toast({
        title: 'Lỗi',
        description: error.error || 'Không thể xóa đánh giá. Vui lòng thử lại.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Đăng nhập để đánh giá</h3>
          <p className="text-muted-foreground">
            Bạn cần đăng nhập để có thể đánh giá tài liệu này
          </p>
        </CardContent>
      </Card>
    );
  }

  if (userRating && !isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Đánh giá của bạn
          </CardTitle>
          <CardDescription>
            Đánh giá của bạn về "{materialTitle}"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <StarRating rating={userRating.rating} readonly showValue />

          {userRating.comment && (
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-sm">{userRating.comment}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              size="sm"
            >
              Chỉnh sửa
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              size="sm"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Xóa
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Đánh giá vào: {new Date(userRating.createdAt).toLocaleDateString('vi-VN')}
            {userRating.updatedAt !== userRating.createdAt && (
              <> • Cập nhật: {new Date(userRating.updatedAt).toLocaleDateString('vi-VN')}</>
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          {userRating ? 'Chỉnh sửa đánh giá' : 'Đánh giá tài liệu'}
        </CardTitle>
        <CardDescription>
          {userRating
            ? `Chỉnh sửa đánh giá của bạn về "${materialTitle}"`
            : `Chia sẻ đánh giá của bạn về "${materialTitle}"`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Đánh giá của bạn *
            </label>
            <StarRating
              rating={formData.rating}
              interactive
              onRatingChange={(rating) => setFormData(prev => ({ ...prev, rating }))}
              size="lg"
            />
          </div>

          <div>
            <label htmlFor="comment" className="block text-sm font-medium mb-2">
              Nhận xét (tùy chọn)
            </label>
            <Textarea
              id="comment"
              value={formData.comment || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Chia sẻ suy nghĩ của bạn về tài liệu này..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {(formData.comment || '').length}/500 ký tự
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || formData.rating === 0}>
              {submitting ? 'Đang gửi...' : userRating ? 'Cập nhật' : 'Gửi đánh giá'}
            </Button>
            {userRating && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    rating: userRating.rating,
                    comment: userRating.comment || '',
                  });
                }}
              >
                Hủy
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
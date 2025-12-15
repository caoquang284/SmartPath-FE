'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { studyMaterialAPI } from '@/lib/api/studyMaterialAPI';
import { StudyMaterialResponse, MaterialStatus, SourceType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  Calendar,
  Tag,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Share2,
  User,
  Bot
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const statusConfig = {
  [MaterialStatus.Pending]: {
    label: 'Đang chờ duyệt',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    icon: AlertCircle,
    description: 'Tài liệu đang chờ quản trị viên xem xét.'
  },
  [MaterialStatus.Accepted]: {
    label: 'Đã duyệt',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    icon: CheckCircle,
    description: 'Tài liệu đã được duyệt và công bố.'
  },
  [MaterialStatus.Rejected]: {
    label: 'Bị từ chối',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: XCircle,
    description: 'Tài liệu không phù hợp với quy định của cộng đồng.'
  }
};

function MaterialDetailSkeleton() {
  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Skeleton className="h-6 w-32" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
          </div>

          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          <Skeleton className="h-12 w-48" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function MaterialDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [material, setMaterial] = useState<StudyMaterialResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMaterial = async () => {
      if (!id || typeof id !== 'string') {
        setError('ID tài liệu không hợp lệ');
        setLoading(false);
        return;
      }

      try {
        const data = await studyMaterialAPI.getById(id);
        setMaterial(data);
      } catch (error: any) {
        console.error('Failed to fetch material:', error);
        setError(error.error || 'Không tìm thấy tài liệu');
      } finally {
        setLoading(false);
      }
    };

    fetchMaterial();
  }, [id]);

  const handleShare = async () => {
    if (!material) return;

    const url = window.location.href;
    const title = material.title;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        toast({
          title: 'Đã sao chép',
          description: 'Liên kết đã được sao chép vào clipboard',
        });
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  if (loading) {
    return <MaterialDetailSkeleton />;
  }

  if (error || !material) {
    return (
      <div className="max-w-4xl">
        <div className="mb-6">
          <Link href="/materials" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Quay lại thư viện
          </Link>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Không tìm thấy tài liệu</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link href="/materials">
              <Button>Quay lại thư viện</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[material.status];
  const StatusIcon = status.icon;

  return (
    <div className="max-w-4xl">
      {/* Back Navigation */}
      <div className="mb-6">
        <Link href="/materials" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Quay lại thư viện
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{material.title}</CardTitle>
              <CardDescription className="text-base">
                {material.description}
              </CardDescription>
            </div>
            <Badge className={`shrink-0 ${status.color}`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Alert */}
          <Alert>
            <StatusIcon className="h-4 w-4" />
            <AlertDescription>
              {status.description}
            </AlertDescription>
          </Alert>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Danh mục:</span>
              <Badge variant="outline">{material.categoryPath}</Badge>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Đăng vào:</span>
              <span>
                {formatDistanceToNow(new Date(material.createdAt), {
                  addSuffix: true,
                  locale: vi,
                })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Loại:</span>
              <span>
                {material.sourceType === SourceType.File ? 'Tệp tài liệu' : 'Liên kết bên ngoài'}
              </span>
            </div>

            {material.aiConfidence && (
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Độ tin cậy AI:</span>
                <span>{Math.round(material.aiConfidence * 100)}%</span>
              </div>
            )}
          </div>

          {/* Rejection Reason */}
          {material.status === MaterialStatus.Rejected && material.rejectReason && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Lý do từ chối:</strong> {material.rejectReason}
              </AlertDescription>
            </Alert>
          )}

          {/* AI Analysis */}
          {material.aiReason && (
            <div className="bg-muted/50 p-4 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-4 w-4" />
                <span className="font-medium text-sm">Phân tích AI</span>
              </div>
              <p className="text-sm text-muted-foreground italic">{material.aiReason}</p>
            </div>
          )}

          {/* Action Buttons */}
          {material.status === MaterialStatus.Accepted && (
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              {material.sourceType === SourceType.File ? (
                <Link href={material.fileUrl || '#'} target="_blank" rel="noopener noreferrer">
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Tải xuống tài liệu
                  </Button>
                </Link>
              ) : (
                <Link href={material.sourceUrl || '#'} target="_blank" rel="noopener noreferrer">
                  <Button>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Mở liên kết
                  </Button>
                </Link>
              )}

              <Button variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Chia sẻ
              </Button>
            </div>
          )}

          {/* Additional Info */}
          {material.updatedAt && material.updatedAt !== material.createdAt && (
            <div className="text-xs text-muted-foreground border-t pt-4">
              Cập nhật lần cuối:{' '}
              {formatDistanceToNow(new Date(material.updatedAt), {
                addSuffix: true,
                locale: vi,
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related Materials Section (Placeholder) */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Tài liệu liên quan</h2>
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Tính năng tài liệu liên quan sẽ được cập nhật sớm
            </p>
            <Link href="/materials" className="mt-4 inline-block">
              <Button variant="outline">Khám phá thêm tài liệu</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
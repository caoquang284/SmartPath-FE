'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { studyMaterialAPI } from '@/lib/api/studyMaterialAPI';
import { StudyMaterialResponse, MaterialStatus, SourceType } from '@/lib/types';
import { isAdmin } from '@/lib/auth-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  ExternalLink,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Bot,
  Download,
  MessageSquare
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const statusConfig = {
  [MaterialStatus.Pending]: {
    label: 'Đang chờ duyệt',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    icon: AlertCircle
  },
  [MaterialStatus.Accepted]: {
    label: 'Đã duyệt',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    icon: CheckCircle
  },
  [MaterialStatus.Rejected]: {
    label: 'Bị từ chối',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: XCircle
  }
};

interface MaterialCardProps {
  material: StudyMaterialResponse;
  onReview: (id: string, decision: 'Accepted' | 'Rejected', reason?: string) => void;
  isReviewing: boolean;
}

function MaterialCard({ material, onReview, isReviewing }: MaterialCardProps) {
  const status = statusConfig[material.status] || statusConfig[MaterialStatus.Pending];
  const StatusIcon = status.icon;
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'Accepted' | 'Rejected'>('Accepted');
  const [reviewReason, setReviewReason] = useState('');

  const handleReview = () => {
    onReview(material.id, reviewDecision, reviewReason || undefined);
    setShowReviewDialog(false);
    setReviewReason('');
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-2 hover:text-primary transition-colors">
                <Link href={`/materials/${material.id}`} className="hover:underline">
                  {material.title}
                </Link>
              </CardTitle>
              <CardDescription className="line-clamp-2 mt-1">
                {material.description}
              </CardDescription>
            </div>
            <Badge className={`shrink-0 ${status.color}`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <Badge variant="outline" className="text-xs">
                {material.categoryPath}
              </Badge>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(material.createdAt), {
                  addSuffix: true,
                  locale: vi,
                })}
              </span>
              {material.totalRatings > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {material.averageRating.toFixed(1)}/5 ({material.totalRatings})
                </span>
              )}
              {material.aiConfidence && (
                <span className="flex items-center gap-1">
                  <Bot className="h-3 w-3" />
                  AI: {Math.round(material.aiConfidence * 100)}%
                </span>
              )}
            </div>

            {/* AI Analysis */}
            {material.aiReason && (
              <div className="bg-muted/50 p-3 rounded-md">
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="h-4 w-4" />
                  <span className="text-sm font-medium">Phân tích AI</span>
                </div>
                <p className="text-xs text-muted-foreground">{material.aiReason}</p>
              </div>
            )}

            {/* Preview Links */}
            {material.sourceType === SourceType.File ? (
              <Link href={material.fileUrl || '#'} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Xem tài liệu
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </Link>
            ) : (
              <Link href={material.sourceUrl || '#'} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Mở liên kết
                </Button>
              </Link>
            )}

            {/* Admin Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-green-600 hover:text-green-700"
                onClick={() => {
                  setReviewDecision('Accepted');
                  setShowReviewDialog(true);
                }}
                disabled={isReviewing || material.status === MaterialStatus.Accepted}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Duyệt
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-red-600 hover:text-red-700"
                onClick={() => {
                  setReviewDecision('Rejected');
                  setShowReviewDialog(true);
                }}
                disabled={isReviewing || material.status === MaterialStatus.Rejected}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Từ chối
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Link href={`/materials/${material.id}`} className="flex-1">
                <Button variant="ghost" size="sm" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  Chi tiết
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDecision === 'Accepted' ? 'Duyệt tài liệu' : 'Từ chối tài liệu'}
            </DialogTitle>
            <DialogDescription>
              {reviewDecision === 'Accepted'
                ? 'Xác nhận duyệt tài liệu này để hiển thị công khai'
                : 'Nhập lý do từ chối tài liệu này'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-md">
              <h4 className="font-medium text-sm">{material.title}</h4>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {material.description}
              </p>
            </div>

            {reviewDecision === 'Rejected' && (
              <div className="space-y-2">
                <label htmlFor="reason" className="text-sm font-medium">
                  Lý do từ chối *
                </label>
                <Textarea
                  id="reason"
                  placeholder="Nhập lý do từ chối tài liệu..."
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {reviewDecision === 'Accepted' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Tài liệu này sẽ được hiển thị công khai trong thư viện sau khi được duyệt.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReviewDialog(false)}
              disabled={isReviewing}
            >
              Hủy
            </Button>
            <Button
              onClick={handleReview}
              disabled={isReviewing || (reviewDecision === 'Rejected' && !reviewReason.trim())}
              className={reviewDecision === 'Accepted' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isReviewing ? 'Đang xử lý...' : reviewDecision === 'Accepted' ? 'Duyệt' : 'Từ chối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface MaterialSkeletonProps {
  count?: number;
}

function MaterialSkeleton({ count = 5 }: MaterialSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-20 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminMaterialsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<StudyMaterialResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState('pending');
  const [isReviewing, setIsReviewing] = useState(false);
  const pageSize = 12;

  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0
  });

  // Check if user is admin
  useEffect(() => {
    if (profile && !isAdmin(profile)) {
      toast({
        title: 'Không có quyền truy cập',
        description: 'Trang này chỉ dành cho quản trị viên',
        variant: 'destructive',
      });
    }
  }, [profile, toast]);

  // Fetch stats
  const fetchStats = async () => {
    try {
      const [allMaterials, pendingMaterials, acceptedMaterials, rejectedMaterials] = await Promise.all([
        studyMaterialAPI.search({ pageSize: 1 }),
        studyMaterialAPI.search({ status: MaterialStatus.Pending, pageSize: 1 }),
        studyMaterialAPI.search({ status: MaterialStatus.Accepted, pageSize: 1 }),
        studyMaterialAPI.search({ status: MaterialStatus.Rejected, pageSize: 1 })
      ]);

      setStats({
        total: allMaterials.total,
        pending: pendingMaterials.total,
        accepted: acceptedMaterials.total,
        rejected: rejectedMaterials.total
      });
    } catch (error: any) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Fetch materials
  const fetchMaterials = async () => {
    setLoading(true);
    try {
      let statusFilter: number | undefined;
      if (activeTab === 'pending') statusFilter = MaterialStatus.Pending;
      else if (activeTab === 'accepted') statusFilter = MaterialStatus.Accepted;
      else if (activeTab === 'rejected') statusFilter = MaterialStatus.Rejected;

      const response = await studyMaterialAPI.search({
        status: statusFilter as 0 | 1 | 2 | undefined,
        q: searchQuery || undefined,
        page: currentPage,
        pageSize: pageSize,
      });

      setMaterials(response.items);
      setTotalPages(Math.ceil(response.total / pageSize));
      setTotalCount(response.total);
    } catch (error: any) {
      console.error('Failed to fetch materials:', error);
      toast({
        title: 'Lỗi',
        description: error.error || 'Không tải được tài liệu',
        variant: 'destructive',
      });
      setMaterials([]);
      setTotalPages(0);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile && isAdmin(profile)) {
      fetchStats();
      fetchMaterials();
    }
  }, [profile, activeTab, currentPage, searchQuery, toast]);

  const handleReview = async (id: string, decision: 'Accepted' | 'Rejected', reason?: string) => {
    setIsReviewing(true);
    try {
      await studyMaterialAPI.review(id, { decision, reason });

      toast({
        title: 'Thành công',
        description: `Đã ${decision === 'Accepted' ? 'duyệt' : 'từ chối'} tài liệu`,
      });

      // Refresh stats and list
      fetchStats();
      fetchMaterials();
    } catch (error: any) {
      console.error('Review failed:', error);
      toast({
        title: 'Lỗi',
        description: error.error || 'Không thể thực hiện thao tác',
        variant: 'destructive',
      });
    } finally {
      setIsReviewing(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchMaterials();
  };

  // Redirect if not admin
  if (profile && !isAdmin(profile)) {
    return (
      <div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Không có quyền truy cập</h2>
            <p className="text-muted-foreground mb-4">
              Trang này chỉ dành cho quản trị viên
            </p>
            <Link href="/dashboard">
              <Button>Quay lại dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Quản lý tài liệu</h1>
          <p className="text-muted-foreground">
            Duyệt và quản lý tài liệu do người dùng đăng tải
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/materials">
            <Button variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              Xem thư viện
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm tài liệu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Tìm kiếm</Button>
          </form>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Tổng số tài liệu</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.pending}
                </p>
                <p className="text-sm text-muted-foreground">Chờ duyệt</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {stats.accepted}
                </p>
                <p className="text-sm text-muted-foreground">Đã duyệt</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {stats.rejected}
                </p>
                <p className="text-sm text-muted-foreground">Bị từ chối</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Status Filter */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="pending">Chờ duyệt</TabsTrigger>
          <TabsTrigger value="accepted">Đã duyệt</TabsTrigger>
          <TabsTrigger value="rejected">Bị từ chối</TabsTrigger>
          <TabsTrigger value="all">Tất cả</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {/* Results Info */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Hiển thị {(materials || []).length} tài liệu
              {searchQuery && ' cho từ khóa tìm kiếm'}
            </p>
          </div>

          {/* Materials List */}
          {loading ? (
            <MaterialSkeleton />
          ) : (materials || []).length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? 'Không tìm thấy tài liệu' : 'Không có tài liệu nào'}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Thử thay đổi từ khóa tìm kiếm' : `Không có tài liệu ${
                    activeTab === 'pending' ? 'chờ duyệt' :
                    activeTab === 'accepted' ? 'đã duyệt' :
                    activeTab === 'rejected' ? 'bị từ chối' : 'nào'
                  }`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {(materials || []).map((material) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  onReview={handleReview}
                  isReviewing={isReviewing}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
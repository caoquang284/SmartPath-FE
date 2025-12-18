'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { materialCategoryAPI, studyMaterialAPI } from '@/lib/api/studyMaterialAPI';
import { MaterialCategory, StudyMaterialResponse, MaterialStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  FolderTree,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Clock,
  BarChart3,
  BookOpen,
  Upload,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface DashboardStats {
  totalMaterials: number;
  pendingMaterials: number;
  acceptedMaterials: number;
  rejectedMaterials: number;
  totalCategories: number;
  activeCategories: number;
  inactiveCategories: number;
  recentUploads: StudyMaterialResponse[];
  popularCategories: Array<{ category: MaterialCategory; count: number }>;
}

function StatCard({ title, value, description, icon, color }: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-2xl font-bold ${color || ''}`}>{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="h-8 w-8 text-muted-foreground">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentMaterials({ materials }: { materials: StudyMaterialResponse[] }) {
  const statusConfig = {
    [MaterialStatus.Pending]: { color: 'text-yellow-600', icon: AlertCircle, label: 'Chờ duyệt' },
    [MaterialStatus.Accepted]: { color: 'text-green-600', icon: CheckCircle, label: 'Đã duyệt' },
    [MaterialStatus.Rejected]: { color: 'text-red-600', icon: XCircle, label: 'Bị từ chối' }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tài liệu gần đây</CardTitle>
        <CardDescription>
          Các tài liệu được tải lên gần đây nhất
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {materials.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Chưa có tài liệu nào
            </p>
          ) : (
            materials.map((material) => {
              const status = statusConfig[material.status] || statusConfig[MaterialStatus.Pending];
              const StatusIcon = status.icon;

              return (
                <div key={material.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/materials/${material.id}`} className="font-medium hover:underline truncate">
                        {material.title}
                      </Link>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {material.categoryPath}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(material.createdAt), { addSuffix: true, locale: vi })}
                      </span>
                      {material.aiConfidence && (
                        <span className="flex items-center gap-1">
                          AI: {Math.round(material.aiConfidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={status.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                    <Link href={`/admin/materials`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="mt-4 pt-4 border-t">
          <Link href="/admin/materials">
            <Button variant="outline" className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              Xem tất cả tài liệu
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryTree({ categories }: { categories: MaterialCategory[] }) {
  const renderCategory = (category: MaterialCategory, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;

    return (
      <div key={category.id}>
        <div
          className="flex items-center gap-2 p-2 hover:bg-accent rounded-md"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          <FolderTree className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{category.name}</span>
          <Badge variant="outline" className="text-xs">
            /{category.path}
          </Badge>
          {!category.isActive && (
            <Badge variant="secondary" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
        {hasChildren && (
          <div>
            {category.children.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cấu trúc danh mục</CardTitle>
        <CardDescription>
          Cây phân cấp danh mục tài liệu
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-64 overflow-y-auto">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Chưa có danh mục nào
            </p>
          ) : (
            <div className="space-y-1">
              {categories.map((category) => renderCategory(category))}
            </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t">
          <Link href="/admin/categories">
            <Button variant="outline" className="w-full">
              <FolderTree className="mr-2 h-4 w-4" />
              Quản lý danh mục
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hành động nhanh</CardTitle>
        <CardDescription>
          Các tác vụ quản trị thường dùng
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2">
          <Link href="/admin/materials">
            <Button variant="outline" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              Duyệt tài liệu đang chờ
            </Button>
          </Link>
          <Link href="/admin/categories">
            <Button variant="outline" className="w-full justify-start">
              <FolderTree className="mr-2 h-4 w-4" />
              Thêm danh mục mới
            </Button>
          </Link>
          <Link href="/materials">
            <Button variant="outline" className="w-full justify-start">
              <BookOpen className="mr-2 h-4 w-4" />
              Xem thư viện công khai
            </Button>
          </Link>
          <Link href="/admin/materials?status=rejected">
            <Button variant="outline" className="w-full justify-start">
              <XCircle className="mr-2 h-4 w-4" />
              Xem tài liệu bị từ chối
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminStudyMaterialsDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState<DashboardStats>({
    totalMaterials: 0,
    pendingMaterials: 0,
    acceptedMaterials: 0,
    rejectedMaterials: 0,
    totalCategories: 0,
    activeCategories: 0,
    inactiveCategories: 0,
    recentUploads: [],
    popularCategories: []
  });
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Check admin permissions
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      toast({
        title: 'Không có quyền truy cập',
        description: 'Trang này chỉ dành cho quản trị viên',
        variant: 'destructive',
      });
    }
  }, [profile, toast]);

  // Fetch dashboard data
  useEffect(() => {
    if (profile?.role === 'admin') {
      const fetchDashboardData = async () => {
        try {
          // Fetch categories
          const categoriesData = await materialCategoryAPI.getTree();
          setCategories(categoriesData);

          // Fetch materials stats
          const [pendingData, acceptedData, rejectedData, recentData] = await Promise.all([
            studyMaterialAPI.search({ status: MaterialStatus.Pending }),
            studyMaterialAPI.search({ status: MaterialStatus.Accepted }),
            studyMaterialAPI.search({ status: MaterialStatus.Rejected }),
            studyMaterialAPI.search({})
          ]);

          // Calculate categories stats
          const allCategories = flattenCategories(categoriesData);
          const activeCategories = allCategories.filter(cat => cat.isActive);
          const inactiveCategories = allCategories.filter(cat => !cat.isActive);

          setStats({
            totalMaterials: pendingData.total + acceptedData.total + rejectedData.total,
            pendingMaterials: pendingData.total,
            acceptedMaterials: acceptedData.total,
            rejectedMaterials: rejectedData.total,
            totalCategories: allCategories.length,
            activeCategories: activeCategories.length,
            inactiveCategories: inactiveCategories.length,
            recentUploads: recentData.items,
            popularCategories: [] // TODO: Implement when backend supports analytics
          });
        } catch (error: any) {
          console.error('Failed to fetch dashboard data:', error);
          toast({
            title: 'Lỗi',
            description: error.error || 'Không tải được dữ liệu dashboard',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      };

      fetchDashboardData();
    }
  }, [profile, toast]);

  // Helper function to flatten category tree
  function flattenCategories(categories: MaterialCategory[]): MaterialCategory[] {
    const result: MaterialCategory[] = [];

    function traverse(cat: MaterialCategory) {
      result.push(cat);
      if (cat.children && cat.children.length > 0) {
        cat.children.forEach(traverse);
      }
    }

    categories.forEach(traverse);
    return result;
  }

  // Redirect if not admin
  if (profile && profile.role !== 'admin') {
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Quản lý tài liệu học tập</h1>
          <p className="text-muted-foreground">
            Tổng quan và quản lý hệ thống tài liệu và danh mục
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/materials">
            <Button variant="outline">
              <BookOpen className="mr-2 h-4 w-4" />
              Xem thư viện
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Tổng tài liệu"
          value={stats.totalMaterials}
          description="Tổng số tài liệu đã đăng"
          icon={<FileText className="h-8 w-8" />}
        />
        <StatCard
          title="Chờ duyệt"
          value={stats.pendingMaterials}
          description="Cần xem xét"
          icon={<AlertCircle className="h-8 w-8" />}
          color="text-yellow-600"
        />
        <StatCard
          title="Đã duyệt"
          value={stats.acceptedMaterials}
          description="Đã công bố"
          icon={<CheckCircle className="h-8 w-8" />}
          color="text-green-600"
        />
        <StatCard
          title="Danh mục"
          value={stats.totalCategories}
          description={`${stats.activeCategories} hoạt động`}
          icon={<FolderTree className="h-8 w-8" />}
          color="text-blue-600"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="recent" className="w-full">
            <TabsList>
              <TabsTrigger value="recent">Tài liệu gần đây</TabsTrigger>
              <TabsTrigger value="categories">Danh mục</TabsTrigger>
            </TabsList>

            <TabsContent value="recent" className="mt-4">
              <RecentMaterials materials={stats.recentUploads} />
            </TabsContent>

            <TabsContent value="categories" className="mt-4">
              <CategoryTree categories={categories} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <QuickActions />

          {/* Approval Rate */}
          <Card>
            <CardHeader>
              <CardTitle>Tỷ lệ duyệt</CardTitle>
              <CardDescription>
                Tỷ lệ tài liệu được duyệt tự động và thủ công
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Tổng thể</span>
                    <span>{stats.totalMaterials > 0 ? Math.round((stats.acceptedMaterials / stats.totalMaterials) * 100) : 0}%</span>
                  </div>
                  <Progress
                    value={stats.totalMaterials > 0 ? (stats.acceptedMaterials / stats.totalMaterials) * 100 : 0}
                    className="h-2"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-medium text-green-600">{stats.acceptedMaterials}</div>
                    <div className="text-muted-foreground">Đồng ý</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-yellow-600">{stats.pendingMaterials}</div>
                    <div className="text-muted-foreground">Chờ</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-red-600">{stats.rejectedMaterials}</div>
                    <div className="text-muted-foreground">Từ chối</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
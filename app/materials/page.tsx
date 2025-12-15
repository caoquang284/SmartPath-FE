'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { materialCategoryAPI, studyMaterialAPI } from '@/lib/api/studyMaterialAPI';
import { MaterialCategory, StudyMaterialResponse, MaterialStatus, SourceType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronRight,
  ChevronDown,
  FileText,
  ExternalLink,
  Search,
  Upload,
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
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

interface CategoryTreeProps {
  categories: MaterialCategory[];
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  expandedCategories: Set<string>;
  onToggleExpand: (categoryId: string) => void;
}

function CategoryTree({
  categories,
  selectedCategoryId,
  onCategorySelect,
  expandedCategories,
  onToggleExpand
}: CategoryTreeProps) {
  const renderCategory = (category: MaterialCategory, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const isSelected = selectedCategoryId === category.id;

    return (
      <div key={category.id}>
        <div
          className={`flex items-center gap-1 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors ${
            isSelected ? 'bg-accent font-medium' : ''
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => onCategorySelect(category.id)}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(category.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{category.name}</span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {category.children.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      <div
        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors ${
          selectedCategoryId === null ? 'bg-accent font-medium' : ''
        }`}
        onClick={() => onCategorySelect(null)}
      >
        <BookOpen className="h-4 w-4" />
        <span className="text-sm">Tất cả danh mục</span>
      </div>
      {categories.map((category) => renderCategory(category))}
    </div>
  );
}

interface MaterialCardProps {
  material: StudyMaterialResponse;
}

function MaterialCard({ material }: MaterialCardProps) {
  const status = statusConfig[material.status];
  const StatusIcon = status.icon;

  return (
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {material.categoryPath}
            </Badge>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(material.createdAt), {
                addSuffix: true,
                locale: vi,
              })}
            </span>
          </div>

          {material.status === MaterialStatus.Rejected && material.rejectReason && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              <strong>Lý do từ chối:</strong> {material.rejectReason}
            </div>
          )}

          {material.status === MaterialStatus.Accepted && (
            <div className="flex items-center gap-2 pt-2">
              {material.sourceType === SourceType.File ? (
                <Link href={material.fileUrl || '#'} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Xem tài liệu
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </Link>
              ) : (
                <Link href={material.sourceUrl || '#'} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Mở liên kết
                  </Button>
                </Link>
              )}
            </div>
          )}

          {material.aiReason && (
            <div className="text-xs text-muted-foreground italic">
              AI: {material.aiReason}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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
              <Skeleton className="h-9 w-32" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function MaterialsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<StudyMaterialResponse[]>([]);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 12;

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await materialCategoryAPI.getTree();
        setCategories(data);

        // Auto-expand first level categories
        const firstLevelIds = data
          .filter(cat => cat.level === 0)
          .map(cat => cat.id);
        setExpandedCategories(new Set(firstLevelIds));
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        toast({
          title: 'Lỗi',
          description: 'Không tải được danh mục tài liệu',
          variant: 'destructive',
        });
      }
    };

    fetchCategories();
  }, [toast]);

  // Fetch materials
  useEffect(() => {
    const fetchMaterials = async () => {
      setLoading(true);
      try {
        const response = await studyMaterialAPI.search({
          categoryId: selectedCategoryId || undefined,
          status: MaterialStatus.Accepted, // Only show accepted materials by default
          q: searchQuery || undefined,
          page: currentPage,
          pageSize,
        });

        setMaterials(response.items);
        setTotalPages(Math.ceil(response.total / pageSize));
        setTotalCount(response.total);
      } catch (error) {
        console.error('Failed to fetch materials:', error);
        toast({
          title: 'Lỗi',
          description: 'Không tải được tài liệu học tập',
          variant: 'destructive',
        });
        setMaterials([]);
        setTotalPages(0);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, [selectedCategoryId, searchQuery, currentPage, toast]);

  const handleToggleExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Thư viện tài liệu</h1>
          <p className="text-muted-foreground">
            Khám phá tài liệu học tập đã được duyệt từ cộng đồng
          </p>
        </div>

        <div className="flex items-center gap-2">
          {profile ? (
            <Link href="/materials/upload">
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Đăng tài liệu
              </Button>
            </Link>
          ) : (
            <Link href="/auth/login">
              <Button variant="outline">
                Đăng nhập để đăng tài liệu
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Category Tree Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Danh mục</CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-96 overflow-y-auto">
              <div className="p-4">
                {categories.length > 0 ? (
                  <CategoryTree
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    onCategorySelect={setSelectedCategoryId}
                    expandedCategories={expandedCategories}
                    onToggleExpand={handleToggleExpand}
                  />
                ) : (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search and Filters */}
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

          {/* Results Info */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Tìm thấy {totalCount} tài liệu
              {selectedCategoryId && ' trong danh mục đã chọn'}
              {searchQuery && ' cho từ khóa tìm kiếm'}
            </p>
          </div>

          {/* Materials List */}
          {loading ? (
            <MaterialSkeleton />
          ) : materials.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Không tìm thấy tài liệu</h3>
                <p className="text-muted-foreground mb-4">
                  Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                </p>
                {profile && (
                  <Link href="/materials/upload">
                    <Button>
                      <Upload className="mr-2 h-4 w-4" />
                      Đăng tài liệu đầu tiên
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {materials.map((material) => (
                <MaterialCard key={material.id} material={material} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
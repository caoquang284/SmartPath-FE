'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { studyMaterialAPI } from '@/lib/api/studyMaterialAPI';
import { StudyMaterialResponse, MaterialStatus, SourceType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  ExternalLink,
  Search,
  Upload,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Filter,
  MessageSquare
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';

const getStatusConfig = (t: any) => ({
  [MaterialStatus.Pending]: {
    label: t.materials.statusPending,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    icon: AlertCircle
  },
  [MaterialStatus.Accepted]: {
    label: t.materials.statusApproved,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    icon: CheckCircle
  },
  [MaterialStatus.Rejected]: {
    label: t.materials.statusRejected,
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: XCircle
  }
});

interface MaterialCardProps {
  material: StudyMaterialResponse;
}

function MaterialCard({ material }: MaterialCardProps) {
  const { t, locale } = useLanguage();
  const statusConfig = getStatusConfig(t);
  const status = statusConfig[material.status] || statusConfig[MaterialStatus.Pending];
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <Badge variant="outline" className="text-xs">
              {material.categoryPath}
            </Badge>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(material.createdAt), {
                addSuffix: true,
                locale: locale === 'vi' ? vi : enUS,
              })}
            </span>
            {material.totalRatings > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {material.averageRating.toFixed(1)}/5 ({material.totalRatings})
              </span>
            )}
          </div>

          {material.status === MaterialStatus.Rejected && material.rejectReason && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              <strong>{t.materials.rejectReason}:</strong> {material.rejectReason}
            </div>
          )}

          {material.status === MaterialStatus.Pending && (
            <div className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
              <strong>{t.materials.statusPending}:</strong> {t.materials.pendingDesc}
            </div>
          )}

          {material.status === MaterialStatus.Accepted && (
            <div className="flex items-center gap-2 pt-2">
              {material.sourceType === SourceType.File ? (
                <Link href={material.fileUrl || '#'} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    {t.materials.viewMaterial}
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </Link>
              ) : (
                <Link href={material.sourceUrl || '#'} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t.materials.openLink}
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

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Link href={`/materials/${material.id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                {t.common.view}
              </Button>
            </Link>
            {/* TODO: Add edit/delete functionality when API supports it */}
          </div>
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

export default function MyMaterialsPage() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<StudyMaterialResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const pageSize = 12;

  // Fetch materials
  const fetchMaterials = async (status?: number) => {
    setLoading(true);
    try {
      // Convert numeric status to enum value for API
      const statusValue = status === undefined ? undefined : status as 0 | 1 | 2;
      const response = await studyMaterialAPI.getMine({
        status: statusValue,
        page: currentPage,
        pageSize
      });

      setMaterials(response.items);
      setTotalPages(Math.ceil(response.total / pageSize));
      setTotalCount(response.total);
    } catch (error: any) {
      console.error('Failed to fetch materials:', error);
      toast({
        title: 'Lỗi',
        description: error.error || 'Không tải được tài liệu của bạn',
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
    if (!profile) return;

    let statusFilter: number | undefined;
    if (activeTab === 'pending') statusFilter = MaterialStatus.Pending;
    else if (activeTab === 'accepted') statusFilter = MaterialStatus.Accepted;
    else if (activeTab === 'rejected') statusFilter = MaterialStatus.Rejected;

    fetchMaterials(statusFilter);
  }, [profile, activeTab, currentPage, toast]);

  const filteredMaterials = materials.filter(material =>
    material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    material.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is client-side for now
    setCurrentPage(1);
  };

  if (!profile) {
    return (
      <div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t.common.signInRequired}</h2>
            <p className="text-muted-foreground mb-4">
              {t.materials.loginToUpload}
            </p>
            <Link href="/auth/login?redirect=/materials/my-materials">
              <Button>{t.common.signIn}</Button>
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
          <h1 className="text-3xl font-bold">{t.materials.myMaterials}</h1>
          <p className="text-muted-foreground">
            {t.materials.manageMyMaterials}
          </p>
        </div>

        <Link href="/materials/upload">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            {t.materials.uploadMaterial}
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.materials.searchMyMaterials}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">{t.common.search}</Button>
          </form>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-sm text-muted-foreground">{t.materials.totalMaterials}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {materials.filter(m => m.status === MaterialStatus.Accepted).length}
                </p>
                <p className="text-sm text-muted-foreground">{t.materials.statusApproved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {materials.filter(m => m.status === MaterialStatus.Pending).length}
                </p>
                <p className="text-sm text-muted-foreground">{t.materials.statusPending}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Status Filter */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="all">{t.friends.tabs.all}</TabsTrigger>
          <TabsTrigger value="accepted">{t.materials.statusApproved}</TabsTrigger>
          <TabsTrigger value="pending">{t.materials.statusPending}</TabsTrigger>
          <TabsTrigger value="rejected">{t.materials.statusRejected}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {/* Results Info */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t.forum.showing.replace('{count}', filteredMaterials.length.toString()).replace('{total}', totalCount.toString())}
            </p>
          </div>

          {/* Materials List */}
          {loading ? (
            <MaterialSkeleton />
          ) : filteredMaterials.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? t.materials.notFound : t.materials.notFound}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? t.materials.notFoundDesc
                    : t.materials.uploadFirst
                  }
                </p>
                {!searchQuery && (
                  <Link href="/materials/upload">
                    <Button>
                      <Upload className="mr-2 h-4 w-4" />
                      {t.materials.uploadFirst}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredMaterials.map((material) => (
                <MaterialCard key={material.id} material={material} />
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
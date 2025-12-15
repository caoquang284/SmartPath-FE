'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { materialCategoryAPI, studyMaterialAPI } from '@/lib/api/studyMaterialAPI';
import { MaterialCategory, SourceType, StudyMaterialResponse } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight,
  ChevronDown,
  Upload,
  FileText,
  ExternalLink,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface CategorySelectorProps {
  categories: MaterialCategory[];
  selectedCategoryId: string;
  onCategorySelect: (categoryId: string) => void;
  expandedCategories: Set<string>;
  onToggleExpand: (categoryId: string) => void;
}

function CategorySelector({
  categories,
  selectedCategoryId,
  onCategorySelect,
  expandedCategories,
  onToggleExpand
}: CategorySelectorProps) {
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
    <div className="space-y-1 max-h-64 overflow-y-auto border rounded-md p-2">
      {categories.map((category) => renderCategory(category))}
    </div>
  );
}

export default function MaterialUploadPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!profile) {
      router.push('/auth/login?redirect=/materials/upload');
    }
  }, [profile, router]);

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<StudyMaterialResponse | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    categoryId: '',
    title: '',
    description: '',
    sourceType: SourceType.File as SourceType,
    sourceUrl: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.categoryId) {
      newErrors.categoryId = 'Vui lòng chọn danh mục';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Vui lòng nhập tiêu đề';
    }

    if (formData.sourceType === SourceType.File && !selectedFile) {
      newErrors.file = 'Vui lòng chọn tệp tài liệu';
    }

    if (formData.sourceType === SourceType.Url && !formData.sourceUrl.trim()) {
      newErrors.sourceUrl = 'Vui lòng nhập liên kết';
    }

    if (formData.sourceType === SourceType.Url) {
      try {
        new URL(formData.sourceUrl);
      } catch {
        newErrors.sourceUrl = 'Liên kết không hợp lệ';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setUploadProgress(0);

    try {
      const result = await studyMaterialAPI.create(
        {
          categoryId: formData.categoryId,
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          sourceType: formData.sourceType,
          sourceUrl: formData.sourceType === SourceType.Url ? formData.sourceUrl.trim() : undefined,
        },
        formData.sourceType === SourceType.File ? selectedFile : undefined,
        (progress) => setUploadProgress(progress)
      );

      setUploadResult(result);

      // Show appropriate success message based on status
      if (result.status === 1) { // Accepted
        toast({
          title: 'Thành công!',
          description: 'Tài liệu đã được đăng và duyệt tự động.',
        });
      } else if (result.status === 0) { // Pending
        toast({
          title: 'Đã gửi đi!',
          description: 'Tài liệu đang chờ duyệt từ quản trị viên.',
        });
      } else { // Rejected
        toast({
          title: 'Bị từ chối',
          description: result.rejectReason || 'Tài liệu không phù hợp với quy định.',
          variant: 'destructive',
        });
      }

      // Reset form on success
      setFormData({
        categoryId: '',
        title: '',
        description: '',
        sourceType: SourceType.File,
        sourceUrl: '',
      });
      setSelectedFile(null);
      setErrors({});

    } catch (error: any) {
      console.error('Upload failed:', error);
      toast({
        title: 'Lỗi',
        description: error.error || 'Không thể đăng tài liệu. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  if (!profile) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Yêu cầu đăng nhập</h2>
          <p className="text-muted-foreground mb-4">
            Bạn cần đăng nhập để đăng tài liệu học tập
          </p>
          <Link href="/auth/login?redirect=/materials/upload">
            <Button>Đăng nhập</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (uploadResult) {
    const statusConfig = {
      0: { label: 'Đang chờ duyệt', icon: AlertCircle, color: 'text-yellow-600' },
      1: { label: 'Đã duyệt', icon: CheckCircle, color: 'text-green-600' },
      2: { label: 'Bị từ chối', icon: XCircle, color: 'text-red-600' }
    };

    const status = statusConfig[uploadResult.status as keyof typeof statusConfig];
    const StatusIcon = status.icon;

    return (
      <Card>
        <CardHeader className="text-center">
          <StatusIcon className={`h-16 w-16 mx-auto mb-4 ${status.color}`} />
          <CardTitle className="text-2xl">
            {status.label}
          </CardTitle>
          <CardDescription>
            Tài liệu của bạn đã được xử lý
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-md">
            <h3 className="font-semibold mb-2">{uploadResult.title}</h3>
            {uploadResult.description && (
              <p className="text-sm text-muted-foreground mb-2">{uploadResult.description}</p>
            )}

            {uploadResult.rejectReason && (
              <div className="text-sm text-red-600 dark:text-red-400 mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded">
                <strong>Lý do từ chối:</strong> {uploadResult.rejectReason}
              </div>
            )}

            {uploadResult.aiReason && (
              <div className="text-xs text-muted-foreground italic mt-2">
                AI: {uploadResult.aiReason}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Link href="/materials/my-materials">
              <Button variant="outline" className="flex-1">
                Xem tài liệu của tôi
              </Button>
            </Link>
            <Link href="/materials">
              <Button variant="outline" className="flex-1">
                Khám phá thêm
              </Button>
            </Link>
            <Button
              onClick={() => {
                setUploadResult(null);
                setUploadProgress(0);
              }}
              className="flex-1"
            >
              Đăng tài liệu khác
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/materials" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Quay lại thư viện
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Đăng tài liệu học tập</CardTitle>
          <CardDescription>
            Chia sẻ tài liệu hữu ích với cộng đồng sinh viên
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label htmlFor="category">Danh mục *</Label>
              <CategorySelector
                categories={categories}
                selectedCategoryId={formData.categoryId}
                onCategorySelect={(id) => {
                  setFormData(prev => ({ ...prev, categoryId: id }));
                  setErrors(prev => ({ ...prev, categoryId: '' }));
                }}
                expandedCategories={expandedCategories}
                onToggleExpand={handleToggleExpand}
              />
              {errors.categoryId && (
                <p className="text-sm text-red-600">{errors.categoryId}</p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Tiêu đề *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, title: e.target.value }));
                  setErrors(prev => ({ ...prev, title: '' }));
                }}
                placeholder="Nhập tiêu đề tài liệu"
                disabled={loading}
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Mô tả ngắn về nội dung tài liệu (tùy chọn)"
                rows={3}
                disabled={loading}
              />
            </div>

            {/* Source Type */}
            <div className="space-y-2">
              <Label>Loại tài liệu *</Label>
              <Select
                value={formData.sourceType.toString()}
                onValueChange={(value) => {
                  setFormData(prev => ({
                    ...prev,
                    sourceType: parseInt(value) as SourceType,
                    sourceUrl: ''
                  }));
                  setSelectedFile(null);
                }}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SourceType.File.toString()}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Tải lên tệp
                    </div>
                  </SelectItem>
                  <SelectItem value={SourceType.Url.toString()}>
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Liên kết bên ngoài
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File Upload */}
            {formData.sourceType === SourceType.File && (
              <div className="space-y-2">
                <Label htmlFor="file">Tệp tài liệu *</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <input
                    id="file"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        setErrors(prev => ({ ...prev, file: '' }));
                      }
                    }}
                    disabled={loading}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md"
                  />
                  <label htmlFor="file" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {selectedFile ? selectedFile.name : 'Nhấp để chọn tệp'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, MD (tối đa 50MB)
                    </p>
                  </label>
                </div>
                {errors.file && (
                  <p className="text-sm text-red-600">{errors.file}</p>
                )}
              </div>
            )}

            {/* URL Input */}
            {formData.sourceType === SourceType.Url && (
              <div className="space-y-2">
                <Label htmlFor="sourceUrl">Liên kết *</Label>
                <Input
                  id="sourceUrl"
                  type="url"
                  value={formData.sourceUrl}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, sourceUrl: e.target.value }));
                    setErrors(prev => ({ ...prev, sourceUrl: '' }));
                  }}
                  placeholder="https://example.com/document"
                  disabled={loading}
                />
                {errors.sourceUrl && (
                  <p className="text-sm text-red-600">{errors.sourceUrl}</p>
                )}
              </div>
            )}

            {/* Upload Progress */}
            {loading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Đang tải lên...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Đang xử lý...' : 'Đăng tài liệu'}
              </Button>
              <Link href="/materials">
                <Button type="button" variant="outline" disabled={loading}>
                  Hủy
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
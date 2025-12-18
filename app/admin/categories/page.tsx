'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { materialCategoryAPI, studyMaterialAPI } from '@/lib/api/studyMaterialAPI';
import { MaterialCategory, StudyMaterialResponse, MaterialCategoryCreateRequest, MaterialCategoryUpdateRequest, SourceType } from '@/lib/types';
import { isAdmin } from '@/lib/auth-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FolderTree,
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronRight,
  ChevronDown,
  Search,
  FolderOpen,
  Folder,
  BookOpen,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface CategoryNodeProps {
  category: MaterialCategory;
  level: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (category: MaterialCategory) => void;
  selectedCategory: MaterialCategory | null;
  onEdit: (category: MaterialCategory) => void;
  onDelete: (category: MaterialCategory) => void;
}

function CategoryNode({
  category,
  level,
  expanded,
  onToggle,
  onSelect,
  selectedCategory,
  onEdit,
  onDelete
}: CategoryNodeProps) {
  const hasChildren = category.children && category.children.length > 0;
  const isExpanded = expanded.has(category.id);
  const isSelected = selectedCategory?.id === category.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors cursor-pointer group ${
          isSelected ? 'bg-accent' : ''
        }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(category.id);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}
        {!hasChildren && <div className="w-6" />}

        <div className="flex-1 flex items-center gap-2">
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground" />
          )}
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

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(category);
            }}
            title="View details"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(category);
            }}
            title="Edit category"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(category);
            }}
            title="Delete category"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {category.children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              level={level + 1}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedCategory={selectedCategory}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CategoryFormProps {
  category?: MaterialCategory | null;
  parentCategory?: MaterialCategory | null;
  onSubmit: (data: MaterialCategoryCreateRequest | MaterialCategoryUpdateRequest) => void;
  onCancel: () => void;
}

function CategoryForm({ category, parentCategory, onSubmit, onCancel }: CategoryFormProps) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    sortOrder: category?.sortOrder || 1,
    isActive: category?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: MaterialCategoryCreateRequest | MaterialCategoryUpdateRequest = {
      ...formData,
      ...(parentCategory && !category && { parentId: parentCategory.id }),
    };
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Tên danh mục *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Nhập tên danh mục"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug (URL-friendly name)</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
          }))}
          placeholder="ten-danh-muc"
        />
        <p className="text-xs text-muted-foreground">
          Sẽ được tự động tạo từ tên nếu để trống
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sortOrder">Thứ tự sắp xếp</Label>
        <Input
          id="sortOrder"
          type="number"
          min="0"
          value={formData.sortOrder}
          onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
        />
        <Label htmlFor="isActive">Kích hoạt</Label>
      </div>

      {parentCategory && (
        <Alert>
          <FolderTree className="h-4 w-4" />
          <AlertDescription>
            Danh mục con của: <strong>{parentCategory.name}</strong> (/{parentCategory.path})
          </AlertDescription>
        </Alert>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit">
          {category ? 'Cập nhật' : 'Tạo mới'}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface CategoryDetailProps {
  category: MaterialCategory;
  onClose: () => void;
}

function CategoryDetail({ category, onClose }: CategoryDetailProps) {
  const [materials, setMaterials] = useState<StudyMaterialResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await studyMaterialAPI.search({
          categoryId: category.id,
          page: 1,
          pageSize: 10,
        });
        setMaterials(response.items);
      } catch (error) {
        console.error('Failed to fetch materials:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, [category.id]);

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Chi tiết danh mục</DialogTitle>
        <DialogDescription>
          Thông tin và tài liệu trong danh mục
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Tên danh mục</Label>
            <p className="text-sm">{category.name}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Đường dẫn</Label>
            <p className="text-sm">/{category.path}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Slug</Label>
            <p className="text-sm">{category.slug}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Cấp độ</Label>
            <p className="text-sm">{category.level}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Thứ tự</Label>
            <p className="text-sm">{category.sortOrder}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Trạng thái</Label>
            <p className="text-sm">
              <Badge variant={category.isActive ? 'default' : 'secondary'}>
                {category.isActive ? 'Kích hoạt' : 'Vô hiệu'}
              </Badge>
            </p>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Danh mục con</Label>
          <p className="text-sm">{category.children?.length || 0} danh mục con</p>
        </div>

        <div>
          <Label className="text-sm font-medium">Tài liệu gần đây</Label>
          {loading ? (
            <div className="space-y-2 mt-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : materials.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">Chưa có tài liệu nào</p>
          ) : (
            <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
              {materials.map((material) => (
                <div key={material.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{material.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {material.sourceType === SourceType.File ? 'Tệp' : 'URL'} • {new Date(material.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link href={`/materials/${material.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button onClick={onClose}>Đóng</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function CategoryTreeSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 p-2">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function AdminCategoriesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MaterialCategory | null>(null);
  const [parentForNew, setParentForNew] = useState<MaterialCategory | null>(null);

  // Check admin permissions
  useEffect(() => {
    if (profile && !isAdmin(profile)) {
      toast({
        title: 'Không có quyền truy cập',
        description: 'Trang này chỉ dành cho quản trị viên',
        variant: 'destructive',
      });
    }
  }, [profile, toast]);

  // Fetch categories
  useEffect(() => {
    if (profile && String(profile.role).toLowerCase() === 'admin') {
      const fetchCategories = async () => {
        try {
          const data = await materialCategoryAPI.getTree();
          setCategories(data);

          // Auto-expand first level categories
          const firstLevelIds = data
            .filter(cat => cat.level === 0)
            .map(cat => cat.id);
          setExpandedCategories(new Set(firstLevelIds));
        } catch (error: any) {
          console.error('Failed to fetch categories:', error);
          toast({
            title: 'Lỗi',
            description: error.error || 'Không tải được danh mục',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      };

      fetchCategories();
    }
  }, [profile, toast]);

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

  const handleCreateCategory = async (data: MaterialCategoryCreateRequest | MaterialCategoryUpdateRequest) => {
    try {
      // Ensure data matches MaterialCategoryCreateRequest type for create operation
      await materialCategoryAPI.create(data as MaterialCategoryCreateRequest);
      toast({
        title: 'Thành công',
        description: 'Đã tạo danh mục mới',
      });
      setShowCreateDialog(false);
      setParentForNew(null);
      // Refresh categories
      const fetchCategories = async () => {
        try {
          const data = await materialCategoryAPI.getTree();
          setCategories(data);
          const firstLevelIds = data
            .filter(cat => cat.level === 0)
            .map(cat => cat.id);
          setExpandedCategories(new Set(firstLevelIds));
        } catch (error) {
          console.error('Failed to fetch categories:', error);
        }
      };
      fetchCategories();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.error || 'Không thể tạo danh mục',
        variant: 'destructive',
      });
    }
  };

  const handleEditCategory = async (data: MaterialCategoryUpdateRequest) => {
    if (!editingCategory) return;

    try {
      await materialCategoryAPI.update(editingCategory.id, data);
      toast({
        title: 'Thành công',
        description: 'Đã cập nhật danh mục',
      });
      setShowEditDialog(false);
      setEditingCategory(null);
      // Refresh categories
      const fetchCategories = async () => {
        try {
          const data = await materialCategoryAPI.getTree();
          setCategories(data);
        } catch (error) {
          console.error('Failed to fetch categories:', error);
        }
      };
      fetchCategories();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.error || 'Không thể cập nhật danh mục',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCategory = async (category: MaterialCategory) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa danh mục "${category.name}"?`)) {
      return;
    }

    try {
      await materialCategoryAPI.delete(category.id);
      toast({
        title: 'Thành công',
        description: 'Đã xóa danh mục',
      });
      // Refresh categories
      const fetchCategories = async () => {
        try {
          const data = await materialCategoryAPI.getTree();
          setCategories(data);
        } catch (error) {
          console.error('Failed to fetch categories:', error);
        }
      };
      fetchCategories();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.error || 'Không thể xóa danh mục',
        variant: 'destructive',
      });
    }
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
          <h1 className="text-3xl font-bold">Quản lý danh mục</h1>
          <p className="text-muted-foreground">
            Tổ chức và quản lý cây tri thức cho tài liệu học tập
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/materials">
            <Button variant="outline">
              <BookOpen className="mr-2 h-4 w-4" />
              Quản lý tài liệu
            </Button>
          </Link>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm danh mục
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-sm text-muted-foreground">Tổng danh mục</p>
              </div>
              <FolderTree className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {categories.filter(cat => cat.isActive).length}
                </p>
                <p className="text-sm text-muted-foreground">Đang kích hoạt</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {categories.filter(cat => !cat.isActive).length}
                </p>
                <p className="text-sm text-muted-foreground">Đang vô hiệu</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Cây danh mục</CardTitle>
              <CardDescription>
                Cấu trúc danh mục tài liệu theo phân cấp
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              {loading ? (
                <CategoryTreeSkeleton />
              ) : categories.length === 0 ? (
                <div className="text-center py-8">
                  <FolderTree className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Chưa có danh mục nào</p>
                  <Button onClick={() => setShowCreateDialog(true)} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Tạo danh mục đầu tiên
                  </Button>
                </div>
              ) : (
                <div>
                  {categories.map((category) => (
                    <CategoryNode
                      key={category.id}
                      category={category}
                      level={0}
                      expanded={expandedCategories}
                      onToggle={handleToggleExpand}
                      onSelect={(cat) => {
                        setSelectedCategory(cat);
                        setShowDetailDialog(true);
                      }}
                      selectedCategory={selectedCategory}
                      onEdit={(cat) => {
                        setEditingCategory(cat);
                        setShowEditDialog(true);
                      }}
                      onDelete={handleDeleteCategory}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Hướng dẫn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Quản lý danh mục</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Nhấp vào mũi tên để mở/đóng danh mục con</li>
                  <li>• Nhấp vào biểu tượng mắt để xem chi tiết</li>
                  <li>• Nhấp vào biểu tượng bút để chỉnh sửa</li>
                  <li>• Nhấp vào biểu tượng thùng rác để xóa</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Cấu trúc cây</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Level 0: Danh mục gốc</li>
                  <li>• Level 1+: Danh mục con</li>
                  <li>• Path: Tạo URL-friendly path</li>
                  <li>• Sort Order: Thứ tự hiển thị</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Trạng thái</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <span className="text-green-600">Kích hoạt</span>: Hiển thị cho người dùng</li>
                  <li>• <span className="text-red-600">Vô hiệu</span>: Ẩn khỏi người dùng</li>
                </ul>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Hệ thống quản lý danh mục đã sẵn sàng sử dụng. Xóa danh mục sẽ xóa cả các danh mục con và tài liệu liên quan.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Category Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm danh mục mới</DialogTitle>
            <DialogDescription>
              Tạo danh mục mới trong hệ thống
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            parentCategory={parentForNew}
            onSubmit={handleCreateCategory}
            onCancel={() => {
              setShowCreateDialog(false);
              setParentForNew(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa danh mục</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin danh mục
            </DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm
              category={editingCategory}
              onSubmit={handleEditCategory}
              onCancel={() => {
                setShowEditDialog(false);
                setEditingCategory(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Category Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        {selectedCategory && (
          <CategoryDetail
            category={selectedCategory}
            onClose={() => {
              setShowDetailDialog(false);
              setSelectedCategory(null);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}
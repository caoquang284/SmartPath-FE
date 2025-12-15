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
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  ExternalLink,
  Search,
  Upload,
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  Award,
  Target,
  ChevronRight,
  FolderOpen,
  Folder,
  Star
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

// Map status strings to enum for backward compatibility
const getStatusFromMaterial = (material: StudyMaterialResponse): MaterialStatus => {
  const status = material.status;
  if (typeof status === 'number') {
    return status as MaterialStatus;
  }
  if (status === 'Approved') return MaterialStatus.Accepted;
  if (status === 'Rejected') return MaterialStatus.Rejected;
  if (status === 'Pending') return MaterialStatus.Pending;
  return MaterialStatus.Pending; // Default fallback
};

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

// Skill Tree Node Component
interface TreeNodeProps {
  category: MaterialCategory;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  hasMaterials: boolean;
  materialCount: number;
  onToggle: (categoryId: string) => void;
  onSelect: (categoryId: string) => void;
  parentPath: string[];
}

function TreeNode({
  category,
  level,
  isExpanded,
  isSelected,
  isHighlighted,
  hasMaterials,
  materialCount,
  onToggle,
  onSelect,
  parentPath
}: TreeNodeProps) {
  const fullPath = [...parentPath, category.name];

  const nodeColors = [
    'from-purple-500 to-pink-500',   // Level 0
    'from-blue-500 to-cyan-500',     // Level 1
    'from-green-500 to-emerald-500',  // Level 2
    'from-orange-500 to-yellow-500', // Level 3
    'from-red-500 to-pink-500'       // Level 4+
  ];

  const colorClass = nodeColors[Math.min(level, nodeColors.length - 1)];
  const size = Math.max(1, 3 - level * 0.5);

  return (
    <div
      className="relative animate-fade-in"
      style={{ animationDelay: `${level * 0.1}s` }}
    >

      {/* Node Container */}
      <div className="relative group">
        {/* Main Node Button for selection */}
        <button
          onClick={() => onSelect(category.id)}
          className={`relative transition-all duration-300 hover:scale-105 z-20 ${
            isSelected ? 'scale-105' : ''
          }`}
        >
          <div
            className={`w-20 h-20 rounded-full bg-gradient-to-br ${colorClass} shadow-lg flex flex-col items-center justify-center text-white relative transition-all duration-300 ${
              hasMaterials ? 'ring-4 ring-white/30' : ''
            } ${isHighlighted ? 'animate-pulse ring-4 ring-yellow-400/50' : ''} ${
              isSelected ? 'ring-4 ring-green-400 scale-105 shadow-green-400/50' : ''
            }`}
          >
            {hasMaterials ? (
            <FolderOpen className="w-6 h-6 mb-1" />
          ) : (
            <Folder className="w-6 h-6 mb-1" />
          )}

          {/* Material Count Badge */}
          {materialCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-white text-gray-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md">
              {materialCount}
            </div>
          )}

          {/* Expand/Collapse Button */}
          {category.children && category.children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(category.id);
              }}
              className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-200 dark:bg-gray-700 rounded-full p-1 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <ChevronRight
                className={`w-3 h-3 transition-transform duration-300 ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              />
            </button>
          )}
        </div>
        </button>

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
          <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg">
            <div className="font-semibold">{category.name}</div>
            {fullPath.length > 1 && (
              <div className="text-xs text-gray-300">{fullPath.slice(0, -1).join(' → ')}</div>
            )}
            {materialCount > 0 && (
              <div className="text-xs text-blue-300">{materialCount} tài liệu</div>
            )}
          </div>
        </div>
      </div>

      {/* Category Name */}
      <div className="text-center mt-2">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {category.name}
        </div>
        <div className="flex items-center justify-center gap-2 mt-1">
          {isSelected && (
            <div className="text-xs text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Đã chọn
            </div>
          )}
          {isHighlighted && (
            <div className="text-xs text-yellow-500 font-semibold flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" />
              Đang xem
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Tree Container Component
function SkillTreeContainer({
  categories,
  selectedCategories,
  expandedCategories,
  highlightedCategory,
  categoryMaterials,
  onToggleCategory,
  onSelectCategory
}: {
  categories: MaterialCategory[];
  selectedCategories: string[];
  expandedCategories: string[];
  highlightedCategory: string | null;
  categoryMaterials: Map<string, StudyMaterialResponse[]>;
  onToggleCategory: (categoryId: string) => void;
  onSelectCategory: (categoryId: string) => void;
}) {
  const renderTreeWithConnections = (children: MaterialCategory[], parent: MaterialCategory, level: number, parentPath: string[]) => {
    return (
      <div className="relative">
        {/* Vertical line from parent down */}
        <div className="absolute left-1/2 transform -translate-x-1/2 -top-12 z-10">
          <svg width="4" height="48" className="overflow-visible drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.5))' }}>
            <defs>
              <linearGradient id={`gradient-${parent.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.9"/>
                <stop offset="50%" stopColor="#A78BFA" stopOpacity="1"/>
                <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.9"/>
              </linearGradient>
            </defs>
            <path
              d="M 2 0 L 2 48"
              stroke={`url(#gradient-${parent.id})`}
              strokeWidth="3"
              fill="none"
              className="animate-pulse"
            />
            <circle r="2" fill="#ffffff" opacity="0.8">
              <animateMotion dur="2s" repeatCount="indefinite" path="M 2 0 L 2 48"/>
            </circle>
          </svg>
        </div>

        {/* Horizontal line across all children */}
        {children.length > 1 && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10">
            <svg width={(children.length - 1) * 80} height="4" className="overflow-visible drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.5))' }}>
              <defs>
                <linearGradient id={`h-gradient-${parent.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.9"/>
                  <stop offset="50%" stopColor="#A78BFA" stopOpacity="1"/>
                  <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.9"/>
                </linearGradient>
              </defs>
              <path
                d={`M 0 2 L ${(children.length - 1) * 80} 2`}
                stroke={`url(#h-gradient-${parent.id})`}
                strokeWidth="3"
                fill="none"
                className="animate-pulse"
              />
            </svg>
          </div>
        )}

        {/* Child nodes */}
        <div className="flex justify-center gap-6 mt-4 relative z-20">
          {children.map((child, index) => {
            const materialCount = categoryMaterials.get(child.id)?.length || 0;
            const xOffset = children.length > 1 ? (index - (children.length - 1) / 2) * 80 : 0;

            return (
              <div
                key={child.id}
                className="flex flex-col items-center relative z-20"
                style={children.length > 1 ? { marginLeft: `${xOffset}px` } : {}}
              >
                {/* Vertical connection from horizontal line to child */}
                {children.length > 1 && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-10">
                    <svg width="4" height="32" className="overflow-visible drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.5))' }}>
                      <path
                        d="M 2 0 L 2 32"
                        stroke={`url(#h-gradient-${parent.id})`}
                        strokeWidth="3"
                        fill="none"
                        className="animate-pulse"
                      />
                    </svg>
                  </div>
                )}

                <TreeNode
                  category={child}
                  level={level}
                  isExpanded={expandedCategories.includes(child.id)}
                  isSelected={selectedCategories.includes(child.id)}
                  isHighlighted={highlightedCategory === child.id}
                  hasMaterials={materialCount > 0}
                  materialCount={materialCount}
                  onToggle={onToggleCategory}
                  onSelect={() => onSelectCategory(child.id)}
                  parentPath={parentPath}
                />

                {/* Recursively render grandchildren */}
                {child.children && child.children.length > 0 && expandedCategories.includes(child.id) && (
                  <div className="relative mt-12">
                    {renderTreeWithConnections(child.children, child, level + 1, [...parentPath, child.name])}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTree = (cats: MaterialCategory[], level: number = 0, parentPath: string[] = []) => {
    return (
      <div className={`flex flex-wrap justify-center ${level === 0 ? 'gap-16' : 'gap-12'} mb-8 relative z-10`}>
        {cats.map((category) => {
          const materialCount = categoryMaterials.get(category.id)?.length || 0;
          return (
            <div key={category.id} className="flex flex-col items-center relative">
              <TreeNode
                category={category}
                level={level}
                isExpanded={expandedCategories.includes(category.id)}
                isSelected={selectedCategories.includes(category.id)}
                isHighlighted={highlightedCategory === category.id}
                hasMaterials={materialCount > 0}
                materialCount={materialCount}
                onToggle={onToggleCategory}
                onSelect={() => onSelectCategory(category.id)}
                parentPath={parentPath}
              />

              {/* Use the new connection system for children */}
              {category.children &&
               category.children.length > 0 &&
               expandedCategories.includes(category.id) && (
                <div className="relative mt-8">
                  {renderTreeWithConnections(category.children, category, level + 1, [...parentPath, category.name])}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl relative">
      <div className="sticky top-0 z-10 p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="flex items-center justify-center">
          <Target className="w-6 h-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Cây Kiến Thức</h2>
        </div>
      </div>
      <div className="p-6 overflow-x-auto overflow-y-auto" style={{ maxHeight: '70vh' }}>
        <div className="min-w-max">
          {renderTree(categories)}
        </div>
      </div>
    </div>
  );
}

// Material Card Component
function MaterialCard({ material, categoryPath }: { material: StudyMaterialResponse; categoryPath: string }) {
  const materialStatus = getStatusFromMaterial(material);
  const status = statusConfig[materialStatus] || statusConfig[MaterialStatus.Pending];
  const StatusIcon = status.icon;

  return (
    <div>
      <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
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
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {categoryPath}
                </Badge>
                {material.sourceType === SourceType.File ? (
                  <Badge variant="secondary" className="text-xs">
                    File
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    URL
                  </Badge>
                )}
              </div>
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
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(material.createdAt), {
                addSuffix: true,
                locale: vi,
              })}
            </div>

            {materialStatus === MaterialStatus.Rejected && material.rejectReason && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                <strong>Lý do từ chối:</strong> {material.rejectReason}
              </div>
            )}

            {materialStatus === MaterialStatus.Accepted && (
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MaterialsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<StudyMaterialResponse[]>([]);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
  const [categoryMaterials, setCategoryMaterials] = useState<Map<string, StudyMaterialResponse[]>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await materialCategoryAPI.getTree();
        setCategories(data);

        // Start with collapsed categories
        setExpandedCategories([]);
        setSelectedCategories([]);
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

  // Fetch materials for selected categories
  useEffect(() => {
    if (selectedCategories.length === 0) return;

    const fetchMaterials = async () => {
      setLoading(true);
      try {
        const materialsMap = new Map<string, StudyMaterialResponse[]>();

        // Fetch materials for each selected category
        const promises = selectedCategories.map(async (categoryId) => {
          try {
            const response = await studyMaterialAPI.search({
              categoryId,
              status: 1, // 1 = Accepted
              page: 1,
              pageSize: 100, // Get more materials for each category
            });
            materialsMap.set(categoryId, response.items);
          } catch (error) {
            console.error(`Failed to fetch materials for category ${categoryId}:`, error);
            materialsMap.set(categoryId, []);
          }
        });

        await Promise.all(promises);
        setCategoryMaterials(materialsMap);

        // Combine all materials for display
        const allMaterials = Array.from(materialsMap.values()).flat();
        setMaterials(allMaterials);
        setTotalCount(allMaterials.length);
      } catch (error) {
        console.error('Failed to fetch materials:', error);
        toast({
          title: 'Lỗi',
          description: 'Không tải được tài liệu học tập',
          variant: 'destructive',
        });
        setMaterials([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, [selectedCategories, toast]);

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const selectCategory = (categoryId: string) => {
    // Toggle selection for multi-select functionality
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const highlightCategory = (categoryId: string) => {
    setHighlightedCategory(prev => prev === categoryId ? null : categoryId);
  };

  const getCategoryPath = (categoryId: string): string => {
    const findPath = (cats: MaterialCategory[], targetId: string, path: string[] = []): string | null => {
      for (const cat of cats) {
        const newPath = [...path, cat.name];
        if (cat.id === targetId) return newPath.join(' / ');
        if (cat.children) {
          const found = findPath(cat.children, targetId, newPath);
          if (found) return found;
        }
      }
      return null;
    };
    return findPath(categories, categoryId) || 'Unknown';
  };

  const getDisplayMaterials = () => {
    if (highlightedCategory) {
      const categoryMats = categoryMaterials.get(highlightedCategory) || [];
      return categoryMats.map(material => ({
        material,
        categoryPath: getCategoryPath(highlightedCategory)
      }));
    }
    return materials.map(material => {
      // Find which category this material belongs to
      for (const [categoryId, categoryMats] of Array.from(categoryMaterials.entries())) {
        if (categoryMats.some(m => m.id === material.id)) {
          return {
            material,
            categoryPath: getCategoryPath(categoryId)
          };
        }
      }
      return { material, categoryPath: 'Unknown' };
    });
  };

  const displayMaterials = getDisplayMaterials();

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Thư viện Kiến Thức
          </h1>
          <p className="text-muted-foreground text-lg">
            Khám phá tài liệu học tập theo cây kiến thức tương tác
          </p>
        </div>

        <div className="flex items-center gap-2">
          {profile ? (
            <>
              <Link href="/materials/my-materials">
                <Button variant="outline">
                  <Folder className="mr-2 h-4 w-4" />
                  Tài liệu của tôi
                </Button>
              </Link>
              <Link href="/materials/upload">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                  <Upload className="mr-2 h-4 w-4" />
                  Đăng tài liệu
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/auth/login">
              <Button variant="outline">
                Đăng nhập để đăng tài liệu
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Hướng dẫn sử dụng:</h3>
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <div>• <strong>Nhấp vào node</strong> để chọn/deselect nhiều danh mục (hiển thị viền xanh)</div>
          <div>• <strong>Nhấp vào mũi tên</strong> (▼) bên dưới node có con để mở/thu gọn danh mục con</div>
          <div>• <strong>Chọn nhiều node</strong> để xem tài liệu từ nhiều danh mục cùng lúc</div>
        </div>
      </div>

      {/* Skill Tree */}
      <SkillTreeContainer
        categories={categories}
        selectedCategories={selectedCategories}
        expandedCategories={expandedCategories}
        highlightedCategory={highlightedCategory}
        categoryMaterials={categoryMaterials}
        onToggleCategory={toggleCategoryExpansion}
        onSelectCategory={selectCategory}
      />

      {/* Materials Display */}
      <div>
        {highlightedCategory && (
          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                Đang xem: {getCategoryPath(highlightedCategory)}
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-9 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : displayMaterials.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-semibold mb-3">Không tìm thấy tài liệu</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {selectedCategories.length === 0
                  ? "Vui lòng chọn danh mục trong cây kiến thức bên trên để xem tài liệu"
                  : "Không có tài liệu nào trong danh mục đã chọn"
                }
              </p>
              {profile && (
                <Link href="/materials/upload">
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                    <Upload className="mr-2 h-4 w-4" />
                    Đăng tài liệu đầu tiên
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayMaterials.map((item, index) => (
                <MaterialCard
                  key={`${item.material.id}-${item.categoryPath}`}
                  material={item.material}
                  categoryPath={item.categoryPath}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
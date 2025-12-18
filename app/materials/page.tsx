'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
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
  const { t } = useLanguage();
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
      className="relative animate-fade-in flex flex-col items-center"
      style={{ animationDelay: `${level * 0.1}s` }}
    >

      {/* Node Container */}
      <div className="relative group">
        {/* Main Node Button for selection */}
        <button
          onClick={() => onSelect(category.id)}
          className={`relative transition-all duration-300 hover:scale-105 z-20 ${isSelected ? 'scale-105' : ''
            }`}
        >
          <div
            className={`w-20 h-20 rounded-full bg-gradient-to-br ${colorClass} shadow-lg flex flex-col items-center justify-center text-white relative transition-all duration-300 ${hasMaterials ? 'ring-4 ring-white/30' : ''
              } ${isHighlighted ? 'animate-pulse ring-4 ring-yellow-400/50' : ''} ${isSelected ? 'ring-4 ring-green-400 scale-105 shadow-green-400/50' : ''
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
          </div>
        </button>

        {/* Expand/Collapse Button */}
        {category.children && category.children.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(category.id);
            }}
            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-200 dark:bg-gray-700 rounded-full p-1 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors z-30"
          >
            <ChevronRight
              className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''
                }`}
            />
          </button>
        )}

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
          <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg">
            <div className="font-semibold">{category.name}</div>
            {fullPath.length > 1 && (
              <div className="text-xs text-gray-300">{fullPath.slice(0, -1).join(' → ')}</div>
            )}
            {materialCount > 0 && (
              <div className="text-xs text-blue-300">{materialCount} {t.materials.materials}</div>
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
              {t.materials.selected}
            </div>
          )}
          {isHighlighted && (
            <div className="text-xs text-yellow-500 font-semibold flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" />
              {t.materials.viewing}
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
  const { t } = useLanguage();
  const renderTreeWithConnections = (children: MaterialCategory[], parent: MaterialCategory, level: number, parentPath: string[]) => {
    return (
      <div className="flex flex-col items-center">
        {/* Vertical line from parent down */}
        <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-600"></div>

        {/* Children container */}
        <div className="flex justify-center gap-8 relative">
          {children.map((child, index) => {
            const materialCount = categoryMaterials.get(child.id)?.length || 0;
            const isFirst = index === 0;
            const isLast = index === children.length - 1;
            const isSingle = children.length === 1;

            return (
              <div
                key={`${child.id}-${index}`}
                className="flex flex-col items-center relative"
              >
                {/* Horizontal connectors */}
                {!isSingle && (
                  <>
                    {!isFirst && (
                      <div className="absolute top-0 right-1/2 w-[calc(50%+16px)] h-0.5 bg-slate-300 dark:bg-slate-600"></div>
                    )}
                    {!isLast && (
                      <div className="absolute top-0 left-1/2 w-[calc(50%+16px)] h-0.5 bg-slate-300 dark:bg-slate-600"></div>
                    )}
                  </>
                )}

                {/* Vertical line to child */}
                <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-600"></div>

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
                  <div className="relative">
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
        {cats.map((category, index) => {
          const materialCount = categoryMaterials.get(category.id)?.length || 0;
          return (
            <div key={`${category.id}-${index}`} className="flex flex-col items-center relative">
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
                  <div className="relative">
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
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{t.materials.knowledgeTree}</h2>
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
  const { t } = useLanguage();
  const materialStatus = getStatusFromMaterial(material);
  const status = statusConfig[materialStatus] || statusConfig[MaterialStatus.Pending];
  const StatusIcon = status.icon;

  const getStatusLabel = (s: MaterialStatus) => {
    switch (s) {
      case MaterialStatus.Pending: return t.materials.statusPending;
      case MaterialStatus.Accepted: return t.materials.statusApproved;
      case MaterialStatus.Rejected: return t.materials.statusRejected;
      default: return t.materials.statusPending;
    }
  };

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
              {getStatusLabel(materialStatus)}
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
                <strong>{t.materials.rejectReason}:</strong> {material.rejectReason}
              </div>
            )}

            {materialStatus === MaterialStatus.Accepted && (
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to get all category IDs including children for filtering
const getCategoryIdsWithDescendants = (selectedIds: string[], categories: MaterialCategory[]): Set<string> => {
  const result = new Set<string>();

  const traverse = (nodes: MaterialCategory[], parentSelected: boolean) => {
    for (const node of nodes) {
      const isSelected = parentSelected || selectedIds.includes(node.id);
      if (isSelected) {
        result.add(node.id);
      }
      if (node.children) {
        traverse(node.children, isSelected);
      }
    }
  };

  traverse(categories, false);
  return result;
};

export default function MaterialsPage() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [allMaterials, setAllMaterials] = useState<StudyMaterialResponse[]>([]);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Derived state for category counts
  const categoryMaterials = useMemo(() => {
    const map = new Map<string, StudyMaterialResponse[]>();
    const mats = Array.isArray(allMaterials) ? allMaterials : [];

    mats.forEach(mat => {
      const list = map.get(mat.categoryId) || [];
      list.push(mat);
      map.set(mat.categoryId, list);
    });

    return map;
  }, [allMaterials]);

  const [searchQuery, setSearchQuery] = useState('');

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

  // Fetch all materials on mount
  useEffect(() => {
    const fetchAllMaterials = async () => {
      setLoading(true);
      try {

        const response: any = await studyMaterialAPI.search({ status: 1 });

        // hỗ trợ cả 2 kiểu response: { items, total } hoặc trả thẳng array
        const items: StudyMaterialResponse[] = Array.isArray(response?.items)
          ? response.items
          : Array.isArray(response)
            ? response
            : [];

        const uniqueMaterials = Array.from(new Map(items.map(item => [item.id, item])).values());

        setAllMaterials(uniqueMaterials);
        setTotalCount(typeof response?.total === "number" ? response.total : uniqueMaterials.length);

      } catch (error) {
        console.error('Failed to fetch materials:', error);
        toast({
          title: 'Lỗi',
          description: 'Không tải được tài liệu học tập',
          variant: 'destructive',
        });
        setAllMaterials([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchAllMaterials();
  }, [toast]);

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => {
      const safe = Array.isArray(prev) ? prev : [];
      return safe.includes(categoryId)
        ? safe.filter(id => id !== categoryId)
        : [...safe, categoryId];
    });
  };

  const selectCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      const safe = Array.isArray(prev) ? prev : [];
      return safe.includes(categoryId)
        ? safe.filter(id => id !== categoryId)
        : [...safe, categoryId];
    });
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
    let filtered = Array.isArray(allMaterials) ? allMaterials : [];

    if (highlightedCategory) {
      filtered = filtered.filter(m => m.categoryId === highlightedCategory);
    } else if (selectedCategories.length > 0) {
      const allowedIds = getCategoryIdsWithDescendants(selectedCategories, categories);
      filtered = filtered.filter(m => allowedIds.has(m.categoryId));
    }

    return filtered.map(material => ({
      material,
      categoryPath: material.categoryPath || getCategoryPath(material.categoryId)
    }));
  };

  const displayMaterials = getDisplayMaterials();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t.materials.title}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t.materials.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {profile ? (
            <>
              <Link href="/materials/my-materials">
                <Button variant="outline">
                  <Folder className="mr-2 h-4 w-4" />
                  {t.materials.myMaterials}
                </Button>
              </Link>
              <Link href="/materials/upload">
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  {t.materials.uploadMaterial}
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/auth/login">
              <Button variant="outline">
                {t.materials.loginToUpload}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{t.materials.instructions}:</h3>
        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <div>• <strong>{t.materials.clickNode}</strong> {t.materials.toSelect}</div>
          <div>• <strong>{t.materials.clickArrow}</strong> (▼) {t.materials.toExpand}</div>
          <div>• <strong>{t.materials.selectMultiple}</strong> {t.materials.toViewMultiple}</div>
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
                {t.materials.viewing}: {getCategoryPath(highlightedCategory)}
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
              <h3 className="text-xl font-semibold mb-3">{t.materials.noMaterialsFound}</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {selectedCategories.length === 0
                  ? t.materials.noMaterialsInLibrary
                  : t.materials.noMaterialsInSelection
                }
              </p>
              {profile && (
                <Link href="/materials/upload">
                  <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    {t.materials.uploadFirstMaterial}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {displayMaterials.map((item, index) => (
              <motion.div
                key={`${item.material.id}-${item.categoryPath}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <MaterialCard
                  material={item.material}
                  categoryPath={item.categoryPath}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { Filter, ChevronDown, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SearchRequest, MaterialCategory } from '@/lib/types';

interface SearchFiltersProps {
  filters: SearchRequest;
  onFiltersChange: (filters: Partial<SearchRequest>) => void;
  categories: MaterialCategory[];
  postCategories: { id: string; name: string }[];
  className?: string;
}

export function SearchFilters({
  filters,
  onFiltersChange,
  categories,
  postCategories,
  className
}: SearchFiltersProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const renderCategoryTree = (categoryList: MaterialCategory[], level = 0) => {
    return categoryList.map(category => {
      const hasChildren = category.children && category.children.length > 0;
      const isExpanded = expandedCategories.includes(category.id);

      return (
        <div key={category.id} style={{ marginLeft: `${level * 16}px` }}>
          <div className="flex items-center space-x-2 py-1">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0"
                onClick={() => toggleCategoryExpansion(category.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            )}
            <Checkbox
              id={`material-cat-${category.id}`}
              checked={filters.materialCategoryIds?.includes(category.id) || false}
              onCheckedChange={(checked) => {
                const currentIds = filters.materialCategoryIds || [];
                const newIds = checked
                  ? [...currentIds, category.id]
                  : currentIds.filter(id => id !== category.id);
                onFiltersChange({ materialCategoryIds: newIds });
              }}
            />
            <label
              htmlFor={`material-cat-${category.id}`}
              className="text-sm cursor-pointer flex-1"
            >
              {category.name}
            </label>
            {/* TODO: Add count from facets */}
          </div>
          {hasChildren && isExpanded && (
            <div className="ml-2">
              {renderCategoryTree(category.children!, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.categoryIds && filters.categoryIds.length > 0) count++;
    if (filters.materialCategoryIds && filters.materialCategoryIds.length > 0) count++;
    if (filters.isQuestion !== null && filters.isQuestion !== undefined) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    return count;
  };

  const clearAllFilters = () => {
    onFiltersChange({
      categoryIds: [],
      materialCategoryIds: [],
      isQuestion: null,
      tags: []
    });
  };

  const removeFilter = (filterType: string, value?: string) => {
    switch (filterType) {
      case 'categoryIds':
        onFiltersChange({
          categoryIds: filters.categoryIds?.filter(id => id !== value) || []
        });
        break;
      case 'materialCategoryIds':
        onFiltersChange({
          materialCategoryIds: filters.materialCategoryIds?.filter(id => id !== value) || []
        });
        break;
      case 'isQuestion':
        onFiltersChange({ isQuestion: null });
        break;
      case 'tags':
        onFiltersChange({
          tags: filters.tags?.filter(tag => tag !== value) || []
        });
        break;
    }
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs"
            >
              Clear all
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Type */}
        <div>
          <label className="text-sm font-medium mb-2 block">Content Type</label>
          <Select
            value={filters.searchType}
            onValueChange={(value: 'All' | 'Posts' | 'StudyMaterials') =>
              onFiltersChange({ searchType: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Content</SelectItem>
              <SelectItem value="Posts">Posts Only</SelectItem>
              <SelectItem value="StudyMaterials">Study Materials Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort Options */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Sort By</label>
            <Select
              value={filters.sortBy}
              onValueChange={(value: any) => onFiltersChange({ sortBy: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="created">Created Date</SelectItem>
                <SelectItem value="updated">Updated Date</SelectItem>
                <SelectItem value="views">Views</SelectItem>
                <SelectItem value="likes">Likes</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Order</label>
            <Select
              value={filters.sortOrder}
              onValueChange={(value: 'asc' | 'desc') =>
                onFiltersChange({ sortOrder: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Options */}
        <div>
          <label className="text-sm font-medium mb-2 block">Search Options</label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="semantic"
                checked={filters.includeSemanticSearch !== false}
                onCheckedChange={(checked) =>
                  onFiltersChange({ includeSemanticSearch: checked as boolean })
                }
              />
              <label htmlFor="semantic" className="text-sm">Semantic Search</label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="keyword"
                checked={filters.includeKeywordSearch !== false}
                onCheckedChange={(checked) =>
                  onFiltersChange({ includeKeywordSearch: checked as boolean })
                }
              />
              <label htmlFor="keyword" className="text-sm">Keyword Search</label>
            </div>
          </div>
        </div>

        {/* Question Filter */}
        {filters.searchType === 'All' || filters.searchType === 'Posts' ? (
          <div>
            <label className="text-sm font-medium mb-2 block">Post Type</label>
            <Select
              value={filters.isQuestion === null ? 'all' : filters.isQuestion ? 'questions' : 'discussions'}
              onValueChange={(value) => {
                const isQuestion = value === 'all' ? null : value === 'questions';
                onFiltersChange({ isQuestion });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Posts</SelectItem>
                <SelectItem value="questions">Questions Only</SelectItem>
                <SelectItem value="discussions">Discussions Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <>
            <Separator />
            <div>
              <label className="text-sm font-medium mb-2 block">Active Filters</label>
              <div className="flex flex-wrap gap-2">
                {filters.categoryIds?.map(catId => {
                  const category = postCategories.find(c => c.id === catId);
                  return category ? (
                    <Badge key={catId} variant="secondary" className="flex items-center gap-1">
                      {category.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-3 w-3 p-0 hover:bg-transparent"
                        onClick={() => removeFilter('categoryIds', catId)}
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </Badge>
                  ) : null;
                })}

                {filters.materialCategoryIds?.map(catId => {
                  // Find category in tree
                  const findCategory = (cats: MaterialCategory[]): MaterialCategory | null => {
                    for (const cat of cats) {
                      if (cat.id === catId) return cat;
                      if (cat.children) {
                        const found = findCategory(cat.children);
                        if (found) return found;
                      }
                    }
                    return null;
                  };

                  const category = findCategory(categories);
                  return category ? (
                    <Badge key={catId} variant="secondary" className="flex items-center gap-1">
                      {category.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-3 w-3 p-0 hover:bg-transparent"
                        onClick={() => removeFilter('materialCategoryIds', catId)}
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </Badge>
                  ) : null;
                })}

                {filters.isQuestion !== null && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {filters.isQuestion ? 'Questions Only' : 'Discussions Only'}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-3 w-3 p-0 hover:bg-transparent"
                      onClick={() => removeFilter('isQuestion')}
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Category Filters */}
        <div className="space-y-4">
          {/* Post Categories */}
          {postCategories.length > 0 && (filters.searchType === 'All' || filters.searchType === 'Posts') && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="font-medium">Post Categories</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {postCategories.map(category => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`post-cat-${category.id}`}
                        checked={filters.categoryIds?.includes(category.id) || false}
                        onCheckedChange={(checked) => {
                          const currentIds = filters.categoryIds || [];
                          const newIds = checked
                            ? [...currentIds, category.id]
                            : currentIds.filter(id => id !== category.id);
                          onFiltersChange({ categoryIds: newIds });
                        }}
                      />
                      <label htmlFor={`post-cat-${category.id}`} className="text-sm">
                        {category.name}
                      </label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Material Categories */}
          {categories.length > 0 && (filters.searchType === 'All' || filters.searchType === 'StudyMaterials') && (
            <Collapsible defaultOpen>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="font-medium">Material Categories</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {categories.map(category => renderCategoryTree([category]))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
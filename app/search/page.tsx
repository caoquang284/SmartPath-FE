'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  BookOpen,
  MessageSquare,
  Star,
  Download,
  Eye,
  ChevronDown,
  X,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  search,
  getPostSuggestions,
  getMaterialSuggestions,
  debounce,
  formatQueryTime,
  getRelevanceScoreColor,
  formatRelevanceScore,
  getMatchTypeStyle,
  getResultTypeLabel
} from '@/lib/api/searchAPI';
import { materialCategoryAPI } from '@/lib/api/studyMaterialAPI';
import { postAPI } from '@/lib/api/postAPI';
import { categoryAPI } from '@/lib/api/categoryAPI';
import { SearchRequest, SearchResponse, MaterialCategory, PostSuggestion, MaterialSuggestion } from '@/lib/types';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [searchRequest, setSearchRequest] = useState<SearchRequest>({
    query: initialQuery,
    searchType: 'All',
    includeSemanticSearch: true,
    includeKeywordSearch: true,
    sortBy: 'relevance',
    sortOrder: 'desc',
    page: 1,
    pageSize: 20
  });
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [postCategories, setPostCategories] = useState<{ id: string; name: string }[]>([]);
  const [suggestions, setSuggestions] = useState<{ posts: PostSuggestion[], materials: MaterialSuggestion[] }>({
    posts: [],
    materials: []
  });
  const [showFilters, setShowFilters] = useState(false);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const [materialCats, postCats] = await Promise.all([
          materialCategoryAPI.getTree(),
          categoryAPI.getAll()
        ]);
        setCategories(materialCats);
        setPostCategories(postCats);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, []);

  
  // Load suggestions when query changes
  useEffect(() => {
    if (query.trim().length > 2) {
      const loadSuggestions = async () => {
        try {
          const [posts, materials] = await Promise.all([
            getPostSuggestions(query, 3),
            getMaterialSuggestions(query, 3)
          ]);
          setSuggestions({ posts, materials });
        } catch (error) {
          console.error('Failed to load suggestions:', error);
        }
      };
      loadSuggestions();
    } else {
      setSuggestions({ posts: [], materials: [] });
    }
  }, [query]);

  const handleSearch = async (searchQuery?: string) => {
    const searchValue = searchQuery || query;
    if (!searchValue.trim()) return;

    setLoading(true);
    try {
      const request: SearchRequest = {
        ...searchRequest,
        query: searchValue,
      };

      const results = await search(request);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: PostSuggestion | MaterialSuggestion) => {
    setQuery(suggestion.title);
    handleSearch(suggestion.title);
    setSuggestions({ posts: [], materials: [] });
  };

  const updateSearchRequest = (updates: Partial<SearchRequest>) => {
    let newRequest = { ...searchRequest, ...updates };

    // Clear filters when switching search type to avoid confusion
    if (updates.searchType && updates.searchType !== searchRequest.searchType) {
      if (updates.searchType === 'Posts') {
        // Clear material categories and rating when switching to Posts only
        newRequest.materialCategoryIds = [];
        if (newRequest.sortBy === 'rating') {
          newRequest.sortBy = 'relevance';
        }
      } else if (updates.searchType === 'StudyMaterials') {
        // Clear post categories and likes when switching to Study Materials only
        newRequest.categoryIds = [];
        if (newRequest.sortBy === 'likes') {
          newRequest.sortBy = 'relevance';
        }
      }
      // When switching to 'All', keep both categories as they are
    }

    setSearchRequest(newRequest);
  };

  const renderCategoryTree = (categories: MaterialCategory[], level = 0) => {
    return categories.map(category => (
      <div key={category.id} style={{ marginLeft: `${level * 16}px` }}>
        <div className="flex items-center space-x-2 py-1">
          <Checkbox
            checked={searchRequest.materialCategoryIds?.includes(category.id) || false}
            onCheckedChange={(checked) => {
              const currentIds = searchRequest.materialCategoryIds || [];
              const newIds = checked
                ? [...currentIds, category.id]
                : currentIds.filter(id => id !== category.id);
              updateSearchRequest({ materialCategoryIds: newIds });
            }}
          />
          <span className="text-sm">{category.name}</span>
        </div>
        {category.children && category.children.length > 0 && (
          renderCategoryTree(category.children, level + 1)
        )}
      </div>
    ));
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Search</h1>
        <p className="text-muted-foreground mb-6">
          Search through posts, study materials, and more
        </p>

          {/* Search Input */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search for anything..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                      setSuggestions({ posts: [], materials: [] });
                    }
                    if (e.key === 'Escape') {
                      setSuggestions({ posts: [], materials: [] });
                    }
                  }}
                  className="pl-10 pr-4"
                />
                {query && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQuery('');
                      setSuggestions({ posts: [], materials: [] });
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Button onClick={() => handleSearch()} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>

            {/* Suggestions */}
            {suggestions.posts.length > 0 || suggestions.materials.length > 0 ? (
              <div className="absolute top-full left-0 right-0 bg-background border rounded-md shadow-lg z-10 mt-1">
                <div className="p-2">
                  {suggestions.posts.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-muted-foreground px-2 py-1">Posts</p>
                      {suggestions.posts.map(post => (
                        <button
                          key={post.id}
                          onClick={() => handleSuggestionClick(post)}
                          className="w-full text-left px-2 py-1 hover:bg-accent rounded text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-3 w-3" />
                            <span>{post.title}</span>
                            {post.isQuestion && (
                              <Badge variant="secondary" className="text-xs">Q</Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {suggestions.materials.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground px-2 py-1">Materials</p>
                      {suggestions.materials.map(material => (
                        <button
                          key={material.id}
                          onClick={() => handleSuggestionClick(material)}
                          className="w-full text-left px-2 py-1 hover:bg-accent rounded text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-3 w-3" />
                            <span>{material.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {getResultTypeLabel(material.type)}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Filters */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Search Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Search Type */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Search Type</label>
                    <Select
                      value={searchRequest.searchType}
                      onValueChange={(value: 'All' | 'Posts' | 'StudyMaterials') =>
                        updateSearchRequest({ searchType: value })
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

                  {/* Sort By */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Sort By</label>
                    <Select
                      value={searchRequest.sortBy}
                      onValueChange={(value: any) =>
                        updateSearchRequest({ sortBy: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">Relevance</SelectItem>
                        <SelectItem value="created">Created Date</SelectItem>
                        <SelectItem value="updated">Updated Date</SelectItem>
                        <SelectItem value="views">Views</SelectItem>
                        {/* Likes only applies to posts */}
                        {(searchRequest.searchType === 'All' || searchRequest.searchType === 'Posts') && (
                          <SelectItem value="likes">Likes</SelectItem>
                        )}
                        {/* Rating only applies to study materials */}
                        {(searchRequest.searchType === 'All' || searchRequest.searchType === 'StudyMaterials') && (
                          <SelectItem value="rating">Rating</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Order</label>
                    <Select
                      value={searchRequest.sortOrder}
                      onValueChange={(value: 'asc' | 'desc') =>
                        updateSearchRequest({ sortOrder: value })
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

                  {/* Search Options */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Search Options</label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="semantic"
                          checked={searchRequest.includeSemanticSearch || false}
                          onCheckedChange={(checked) =>
                            updateSearchRequest({ includeSemanticSearch: checked as boolean })
                          }
                        />
                        <label htmlFor="semantic" className="text-sm">Semantic Search</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="keyword"
                          checked={searchRequest.includeKeywordSearch !== false}
                          onCheckedChange={(checked) =>
                            updateSearchRequest({ includeKeywordSearch: checked as boolean })
                          }
                        />
                        <label htmlFor="keyword" className="text-sm">Keyword Search</label>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Post Categories - Only show when searching for Posts or All */}
                  {(searchRequest.searchType === 'All' || searchRequest.searchType === 'Posts') && (
                    <div>
                      <h3 className="font-medium mb-3">Post Categories</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {postCategories.map(category => (
                          <div key={category.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`post-cat-${category.id}`}
                              checked={searchRequest.categoryIds?.includes(category.id) || false}
                              onCheckedChange={(checked) => {
                                const currentIds = searchRequest.categoryIds || [];
                                const newIds = checked
                                  ? [...currentIds, category.id]
                                  : currentIds.filter(id => id !== category.id);
                                updateSearchRequest({ categoryIds: newIds });
                              }}
                            />
                            <label htmlFor={`post-cat-${category.id}`} className="text-sm">
                              {category.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Material Categories - Only show when searching for Study Materials or All */}
                  {(searchRequest.searchType === 'All' || searchRequest.searchType === 'StudyMaterials') && (
                    <div>
                      <h3 className="font-medium mb-3">Material Categories</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {categories.map(category => renderCategoryTree([category]))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Search Results */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-muted-foreground">Searching...</p>
          </div>
        )}

        {!loading && searchResults && (
          <div>
            {/* Results Summary */}
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    Found {searchResults.totalResults.toLocaleString()} results
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {searchResults.totalPosts} posts, {searchResults.totalStudyMaterials} study materials
                  </p>
                </div>
                {searchResults.queryTime && (
                  <div className="text-sm text-muted-foreground">
                    Search time: {formatQueryTime(searchResults.queryTime)}
                  </div>
                )}
              </div>
            </div>

            {/* Search Suggestions */}
            {searchResults.suggestions && (
              searchResults.suggestions.correctedQuery ||
              searchResults.suggestions.didYouMean.length > 0 ||
              searchResults.suggestions.relatedQueries.length > 0
            ) && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {searchResults.suggestions.correctedQuery && (
                    <div className="mb-3">
                      <span className="text-sm text-muted-foreground">Did you mean: </span>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-sm"
                        onClick={() => {
                          setQuery(searchResults.suggestions!.correctedQuery!);
                          handleSearch(searchResults.suggestions!.correctedQuery);
                        }}
                      >
                        {searchResults.suggestions.correctedQuery}
                      </Button>
                    </div>
                  )}

                  {searchResults.suggestions.didYouMean.length > 0 && (
                    <div className="mb-3">
                      <span className="text-sm text-muted-foreground">Did you mean: </span>
                      {searchResults.suggestions.didYouMean.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="link"
                          className="p-0 h-auto text-sm"
                          onClick={() => {
                            setQuery(suggestion);
                            handleSearch(suggestion);
                          }}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}

                  {searchResults.suggestions.relatedQueries.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground">Related searches: </span>
                      {searchResults.suggestions.relatedQueries.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="link"
                          className="p-0 h-auto text-sm"
                          onClick={() => {
                            setQuery(suggestion);
                            handleSearch(suggestion);
                          }}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Results Tabs */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">
                  All ({searchResults.totalResults})
                </TabsTrigger>
                <TabsTrigger value="posts">
                  Posts ({searchResults.totalPosts})
                </TabsTrigger>
                <TabsTrigger value="materials">
                  Materials ({searchResults.totalStudyMaterials})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                {searchResults.posts.map(post => (
                  <Card key={post.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getMatchTypeStyle(post.matchType)}>
                              {post.matchType}
                            </Badge>
                            <Badge className={getRelevanceScoreColor(post.relevanceScore)}>
                              {formatRelevanceScore(post.relevanceScore)}
                            </Badge>
                            {post.isQuestion && (
                              <Badge variant="outline">Question</Badge>
                            )}
                            {post.isSolved && (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Solved
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
                          <p className="text-muted-foreground mb-3 line-clamp-2">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>By {post.author.displayName}</span>
                            <span>{post.likeCount} likes</span>
                            <span>{post.commentCount} comments</span>
                            <span>{post.viewCount} views</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {searchResults.studyMaterials.map(material => (
                  <Card key={material.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getMatchTypeStyle(material.matchType)}>
                              {material.matchType}
                            </Badge>
                            <Badge className={getRelevanceScoreColor(material.relevanceScore)}>
                              {formatRelevanceScore(material.relevanceScore)}
                            </Badge>
                            <Badge variant="outline">
                              {getResultTypeLabel(material.type)}
                            </Badge>
                            {material.isApproved && (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Approved
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold mb-2">{material.title}</h3>
                          <p className="text-muted-foreground mb-3 line-clamp-2">
                            {material.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>By {material.uploader.displayName}</span>
                            {material.totalRatings > 0 && (
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-current" />
                                {material.averageRating.toFixed(1)} ({material.totalRatings})
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              {material.downloadCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {material.viewCount}
                            </span>
                            <span>{material.category.name}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="posts" className="space-y-4">
                {searchResults.posts.length > 0 ? (
                  searchResults.posts.map(post => (
                    <Card key={post.id}>
                      <CardContent className="pt-6">
                        {/* Post content - same as above */}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No posts found</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="materials" className="space-y-4">
                {searchResults.studyMaterials.length > 0 ? (
                  searchResults.studyMaterials.map(material => (
                    <Card key={material.id}>
                      <CardContent className="pt-6">
                        {/* Material content - same as above */}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No study materials found</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {!loading && !searchResults && query && (
          <div className="text-center py-8">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Enter a search query to find posts and study materials
            </p>
          </div>
        )}
      </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading search...</p>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search as SearchIcon,
  Filter,
  BookOpen,
  MessageSquare,
  Star,
  Download,
  Eye,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  search,
  debounce,
  formatQueryTime,
  getRelevanceScoreColor,
  formatRelevanceScore,
  getMatchTypeStyle,
  getResultTypeLabel
} from '@/lib/api/searchAPI';

import type {
  SearchRequest,
  SearchResponse,
  PostSuggestion,
  MaterialSuggestion
} from '@/lib/types';

// -----------------------------
// Helpers
// -----------------------------
type SearchType = 'All' | 'Posts' | 'StudyMaterials';
type SortBy = 'relevance' | 'created' | 'updated' | 'views' | 'likes' | 'rating';
type SortOrder = 'asc' | 'desc';

const DEFAULT_FILTERS: Omit<SearchRequest, 'query'> = {
  searchType: 'All',
  includeSemanticSearch: true,
  includeKeywordSearch: true,
  sortBy: 'relevance',
  sortOrder: 'desc',
  page: 1,
  pageSize: 20
};

function normalizeFiltersForType(filters: Omit<SearchRequest, 'query'>): Omit<SearchRequest, 'query'> {
  const f = { ...filters };

  if (f.searchType === 'Posts') {
    if (f.sortBy === 'rating') f.sortBy = 'relevance';
  }

  if (f.searchType === 'StudyMaterials') {
    if (f.sortBy === 'likes') f.sortBy = 'relevance';
  }

  return f;
}

function clampPage(page: number, totalPages?: number) {
  if (!totalPages || totalPages <= 0) return Math.max(1, page);
  return Math.min(Math.max(1, page), totalPages);
}

// -----------------------------
// Hooks
// -----------------------------


function useSuggestions(draftQuery: string) {
  const [suggestions, setSuggestions] = useState<{ posts: PostSuggestion[]; materials: MaterialSuggestion[] }>({
    posts: [],
    materials: []
  });

  const clear = useCallback(() => {
    setSuggestions({ posts: [], materials: [] });
  }, []);

  const debouncedFetch = useMemo(() => {
    return debounce(async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length <= 2) {
        clear();
        return;
      }
    }, 180);
  }, [clear]);

  useEffect(() => {
    debouncedFetch(draftQuery);
    return () => {
      // nếu debounce helper của bạn có cancel() thì call ở đây
      // @ts-ignore
      debouncedFetch?.cancel?.();
    };
  }, [draftQuery, debouncedFetch]);

  return { suggestions, clear };
}

function useSearchEngine(initialDraftQuery: string) {
  const router = useRouter();

  const [draftQuery, setDraftQuery] = useState(initialDraftQuery);
  const [activeQuery, setActiveQuery] = useState(''); // chỉ set khi bấm Search / click suggestion / pagination
  const [filters, setFilters] = useState<Omit<SearchRequest, 'query'>>(DEFAULT_FILTERS);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const inflightRef = useRef(0);

  const updateFilters = useCallback((patch: Partial<Omit<SearchRequest, 'query'>>) => {
    setFilters(prev => normalizeFiltersForType({ ...prev, ...patch }));
  }, []);

  const executeSearch = useCallback(
    async (opts?: { query?: string; page?: number; pageSize?: number; pushUrl?: boolean }) => {
      const q = (opts?.query ?? draftQuery).trim();
      if (!q) return;

      const runId = ++inflightRef.current;
      setLoading(true);
      setErrorText(null);

      const nextPage = opts?.page ?? 1;
      const nextPageSize = opts?.pageSize ?? filters.pageSize;

      const request: SearchRequest = {
        ...filters,
        page: nextPage,
        pageSize: nextPageSize,
        query: q
      };

      try {
        const res = await search(request);
        // ignore stale results
        if (runId !== inflightRef.current) return;

        setResults(res);
        setActiveQuery(q);
        setFilters(prev => ({ ...prev, page: nextPage, pageSize: nextPageSize }));

        if (opts?.pushUrl ?? true) {
          // sync URL q=... nhưng KHÔNG auto search lại khi gõ
          const params = new URLSearchParams(window.location.search);
          params.set('q', q);
          router.replace(`?${params.toString()}`);
        }
      } catch (e: any) {
        if (runId !== inflightRef.current) return;
        console.error('Search failed:', e);
        setErrorText('Search failed. Please try again.');
      } finally {
        if (runId === inflightRef.current) setLoading(false);
      }
    },
    [draftQuery, filters, router]
  );

  const clearResults = useCallback(() => {
    setResults(null);
    setActiveQuery('');
    setErrorText(null);
    setFilters(prev => ({ ...prev, page: 1 }));
  }, []);

  return {
    draftQuery,
    setDraftQuery,
    activeQuery,
    filters,
    updateFilters,
    results,
    setResults,
    loading,
    errorText,
    executeSearch,
    clearResults
  };
}

// -----------------------------
// UI pieces
// -----------------------------

function SuggestionsDropdown({
  suggestions,
  onPick,
  onClose
}: {
  suggestions: { posts: PostSuggestion[]; materials: MaterialSuggestion[] };
  onPick: (s: PostSuggestion | MaterialSuggestion) => void;
  onClose: () => void;
}) {
  const hasAny = suggestions.posts.length > 0 || suggestions.materials.length > 0;
  if (!hasAny) return null;

  return (
    <div className="absolute top-full left-0 right-0 bg-background border rounded-md shadow-lg z-10 mt-1">
      <div className="p-2">
        {suggestions.posts.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">Posts</p>
            {suggestions.posts.map(post => (
              <button
                key={post.id}
                onClick={() => {
                  onPick(post);
                  onClose();
                }}
                className="w-full text-left px-2 py-1 hover:bg-accent rounded text-sm"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3 w-3" />
                  <span className="line-clamp-1">{post.title}</span>
                  {post.isQuestion && <Badge variant="secondary" className="text-xs">Q</Badge>}
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
                onClick={() => {
                  onPick(material);
                  onClose();
                }}
                className="w-full text-left px-2 py-1 hover:bg-accent rounded text-sm"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3 w-3" />
                  <span className="line-clamp-1">{material.title}</span>
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
  );
}

// -----------------------------
// Main Content
// -----------------------------
function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';

  const engine = useSearchEngine(initialQ);
  const { suggestions, clear: clearSuggestions } = useSuggestions(engine.draftQuery);

  const [showFilters, setShowFilters] = useState(false);

  const sortOptions = useMemo(() => {
    const base: { value: SortBy; label: string; show: boolean }[] = [
      { value: 'relevance', label: 'Liên quan nhất', show: true },
      { value: 'created', label: 'Ngày tạo', show: true },
      { value: 'updated', label: 'Ngày nâng cấp', show: true }
    ];
    return base.filter(x => x.show);
  }, [engine.filters.searchType]);

  const draftDiffersFromActive =
    engine.activeQuery &&
    engine.draftQuery.trim() &&
    engine.draftQuery.trim() !== engine.activeQuery.trim();

  const onSubmitSearch = useCallback(async () => {
    clearSuggestions();
    await engine.executeSearch({ page: 1, pushUrl: true });
  }, [clearSuggestions, engine]);

  const onPickSuggestion = useCallback(
    async (s: PostSuggestion | MaterialSuggestion) => {
      engine.setDraftQuery(s.title);
      clearSuggestions();
      await engine.executeSearch({ query: s.title, page: 1, pushUrl: true });
    },
    [clearSuggestions, engine]
  );

  const totalPages = useMemo(() => {
    // backend của bạn đang trả totalPages? nếu có thì dùng:
    // @ts-ignore
    return engine.results?.totalPages ?? undefined;
  }, [engine.results]);

  const currentPage = engine.filters.page ?? 1;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-3">Tìm kiếm</h1>
      </div>

      {/* Search bar */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmitSearch();
            }}
          >
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search for anything..."
                    value={engine.draftQuery}
                    onChange={(e) => {
                      engine.setDraftQuery(e.target.value);
                      // IMPORTANT: KHÔNG gọi engine.executeSearch ở đây
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') clearSuggestions();
                    }}
                    className="pl-10 pr-10"
                  />
                  {engine.draftQuery && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        engine.setDraftQuery('');
                        clearSuggestions();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      aria-label="Clear"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <Button type="submit" disabled={engine.loading || !engine.draftQuery.trim()}>
                  <SearchIcon className="h-4 w-4 mr-2" />
                  Tìm kiếm
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFilters(v => !v)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Bộ lọc 
                </Button>
              </div>

              <SuggestionsDropdown
                suggestions={suggestions}
                onPick={onPickSuggestion}
                onClose={clearSuggestions}
              />
            </div>
          </form>

          {/* Hint banner when typing differs from active */}
          {draftDiffersFromActive && (
            <div className="mt-4 p-3 rounded-md bg-muted/50 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                Bạn đang gõ <b>{engine.draftQuery.trim()}</b>. Nội dung hiện tại là của{' '}
                <b>{engine.activeQuery.trim()}</b>. 
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bộ lọc</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Search Type */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Thể loại</label>
                  <Select
                    value={engine.filters.searchType as SearchType}
                    onValueChange={(value: SearchType) =>
                      engine.updateFilters({ searchType: value, page: 1 })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">Toàn bộ</SelectItem>
                      <SelectItem value="Posts">Chỉ bài viết</SelectItem>
                      <SelectItem value="StudyMaterials">Chỉ tài liệu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Sắp xếp theo</label>
                  <Select
                    value={engine.filters.sortBy as SortBy}
                    onValueChange={(value: SortBy) => engine.updateFilters({ sortBy: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Order</label>
                  <Select
                    value={engine.filters.sortOrder as SortOrder}
                    onValueChange={(value: SortOrder) => engine.updateFilters({ sortOrder: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Giảm dần</SelectItem>
                      <SelectItem value="asc">Tăng dần</SelectItem>
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
                        checked={engine.filters.includeSemanticSearch || false}
                        onCheckedChange={(v) => engine.updateFilters({ includeSemanticSearch: v === true })}
                      />
                      <label htmlFor="semantic" className="text-sm">Semantic Search</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="keyword"
                        checked={engine.filters.includeKeywordSearch !== false}
                        onCheckedChange={(v) => engine.updateFilters({ includeKeywordSearch: v === true })}
                      />
                      <label htmlFor="keyword" className="text-sm">Keyword Search</label>
                    </div>
                  </div>
                </div>
              </div>

              
              <Separator className="my-6" />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    engine.clearResults();
                    engine.updateFilters(DEFAULT_FILTERS);
                    clearSuggestions();
                  }}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Loading */}
      {engine.loading && (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="mt-2 text-muted-foreground">Searching...</p>
        </div>
      )}

      {/* Error */}
      {!engine.loading && engine.errorText && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div>{engine.errorText}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results (rendered below filters) */}
      {!engine.loading && engine.results && engine.activeQuery && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                Tìm thấy {engine.results.totalResults.toLocaleString()} kết quả
              </h2>
              <p className="text-sm text-muted-foreground">
                {engine.results.totalPosts} bài đăng, {engine.results.totalStudyMaterials} tài liệu học tập
                {' · '}Tìm kiếm: <b>{engine.activeQuery}</b>
              </p>
            </div>
          </div>

          {/* Suggestions from backend (corrected query / related) */}
          {engine.results.suggestions &&
            (engine.results.suggestions.correctedQuery ||
              engine.results.suggestions.didYouMean.length > 0 ||
              engine.results.suggestions.relatedQueries.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Đề xuất
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {engine.results.suggestions.correctedQuery && (
                    <div className="mb-3">
                      <span className="text-sm text-muted-foreground">Có phải ý bạn là: </span>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-sm"
                        onClick={() => {
                          engine.setDraftQuery(engine.results!.suggestions!.correctedQuery!);
                          engine.executeSearch({ query: engine.results!.suggestions!.correctedQuery!, page: 1 });
                        }}
                      >
                        {engine.results.suggestions.correctedQuery}
                      </Button>
                    </div>
                  )}

                  {engine.results.suggestions.didYouMean.length > 0 && (
                    <div className="mb-3">
                      <span className="text-sm text-muted-foreground">Did you mean: </span>
                      {engine.results.suggestions.didYouMean.map((s, idx) => (
                        <Button
                          key={idx}
                          variant="link"
                          className="p-0 h-auto text-sm mr-2"
                          onClick={() => {
                            engine.setDraftQuery(s);
                            engine.executeSearch({ query: s, page: 1 });
                          }}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  )}

                  {engine.results.suggestions.relatedQueries.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground">Related searches: </span>
                      {engine.results.suggestions.relatedQueries.map((s, idx) => (
                        <Button
                          key={idx}
                          variant="link"
                          className="p-0 h-auto text-sm mr-2"
                          onClick={() => {
                            engine.setDraftQuery(s);
                            engine.executeSearch({ query: s, page: 1 });
                          }}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          {/* Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All ({engine.results.totalResults})</TabsTrigger>
              <TabsTrigger value="posts">Posts ({engine.results.totalPosts})</TabsTrigger>
              <TabsTrigger value="materials">Materials ({engine.results.totalStudyMaterials})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {engine.results.posts.map(post => (
                <Link href={`/forum/${post.id}`} key={post.id}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getMatchTypeStyle(post.matchType)}>{post.matchType}</Badge>
                            <Badge className={getRelevanceScoreColor(post.relevanceScore)}>
                              {formatRelevanceScore(post.relevanceScore)}
                            </Badge>
                            {post.isQuestion && <Badge variant="outline">Question</Badge>}
                            {post.isSolved && (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Solved
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold mb-2 hover:text-blue-600 transition-colors">{post.title}</h3>
                          <p className="text-muted-foreground mb-3 line-clamp-2">{post.content}</p>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span>By {post.author.displayName}</span>
                            <span>{post.likeCount} likes</span>
                            <span>{post.commentCount} comments</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}

              {engine.results.studyMaterials.map(material => (
                <Link href={`/materials/${material.id}`} key={material.id}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getMatchTypeStyle(material.matchType)}>{material.matchType}</Badge>
                            <Badge className={getRelevanceScoreColor(material.relevanceScore)}>
                              {formatRelevanceScore(material.relevanceScore)}
                            </Badge>
                            <Badge variant="outline">{getResultTypeLabel(material.type)}</Badge>
                            {material.isApproved && (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Approved
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold mb-2 hover:text-blue-600 transition-colors">{material.title}</h3>
                          <p className="text-muted-foreground mb-3 line-clamp-2">{material.description}</p>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
                </Link>
              ))}
            </TabsContent>

            <TabsContent value="posts" className="space-y-4">
              {engine.results.posts.length > 0 ? (
                engine.results.posts.map(post => (
                  <Link href={`/forum/${post.id}`} key={post.id}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getMatchTypeStyle(post.matchType)}>{post.matchType}</Badge>
                          <Badge className={getRelevanceScoreColor(post.relevanceScore)}>
                            {formatRelevanceScore(post.relevanceScore)}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-semibold mb-2 hover:text-blue-600 transition-colors">{post.title}</h3>
                        <p className="text-muted-foreground line-clamp-2">{post.content}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="text-center py-10">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Không có bài đăng</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="materials" className="space-y-4">
              {engine.results.studyMaterials.length > 0 ? (
                engine.results.studyMaterials.map(material => (
                  <Link href={`/materials/${material.id}`} key={material.id}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getMatchTypeStyle(material.matchType)}>{material.matchType}</Badge>
                          <Badge className={getRelevanceScoreColor(material.relevanceScore)}>
                            {formatRelevanceScore(material.relevanceScore)}
                          </Badge>
                          <Badge variant="outline">{getResultTypeLabel(material.type)}</Badge>
                        </div>
                        <h3 className="text-lg font-semibold mb-2 hover:text-blue-600 transition-colors">{material.title}</h3>
                        <p className="text-muted-foreground line-clamp-2">{material.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="text-center py-10">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No study materials found</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Pagination (explicit action => ok to call search) */}
          <div className="flex items-center justify-between py-4">
            <div className="text-sm text-muted-foreground">
              Page <b>{currentPage}</b>
              {totalPages ? (
                <>
                  {' '}of <b>{totalPages}</b>
                </>
              ) : null}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={engine.loading || currentPage <= 1}
                onClick={() => {
                  const next = clampPage(currentPage - 1, totalPages);
                  engine.executeSearch({ query: engine.activeQuery, page: next });
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Prev
              </Button>

              <Button
                variant="outline"
                disabled={engine.loading || (totalPages ? currentPage >= totalPages : false)}
                onClick={() => {
                  const next = clampPage(currentPage + 1, totalPages);
                  engine.executeSearch({ query: engine.activeQuery, page: next });
                }}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state: chưa search */}
      {!engine.loading && !engine.results && engine.draftQuery.trim() && (
        <div className="text-center py-10">
          <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Press <b>Search</b> to search for <b>{engine.draftQuery.trim()}</b>.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading search...</p>
          </div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
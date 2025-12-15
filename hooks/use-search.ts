import { useState, useEffect, useCallback } from 'react';
import {
  SearchRequest,
  SearchResponse,
  PostSuggestion,
  MaterialSuggestion,
  comprehensiveSearch,
  getPostSuggestions,
  getMaterialSuggestions,
  debounce
} from '@/lib/api/searchAPI';
import { materialCategoryAPI } from '@/lib/api/studyMaterialAPI';
import { postAPI } from '@/lib/api/postAPI';
import { MaterialCategory } from '@/lib/types';

interface UseSearchOptions {
  autoSearch?: boolean;
  debounceMs?: number;
  enableSuggestions?: boolean;
}

interface UseSearchReturn {
  // State
  query: string;
  results: SearchResponse | null;
  loading: boolean;
  error: string | null;
  suggestions: {
    posts: PostSuggestion[];
    materials: MaterialSuggestion[];
  };
  categories: MaterialCategory[];
  postCategories: { id: string; name: string }[];

  // Actions
  setQuery: (query: string) => void;
  search: (query?: string) => Promise<void>;
  updateFilters: (filters: Partial<SearchRequest>) => void;
  clearResults: () => void;
  loadCategories: () => Promise<void>;
}

export const useSearch = (options: UseSearchOptions = {}): UseSearchReturn => {
  const {
    autoSearch = true,
    debounceMs = 300,
    enableSuggestions = true
  } = options;

  // State
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{
    posts: PostSuggestion[];
    materials: MaterialSuggestion[];
  }>({ posts: [], materials: [] });
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [postCategories, setPostCategories] = useState<{ id: string; name: string }[]>([]);

  // Search request state
  const [searchRequest, setSearchRequest] = useState<SearchRequest>({
    query: '',
    searchType: 'All',
    includeSemanticSearch: true,
    includeKeywordSearch: true,
    sortBy: 'relevance',
    sortOrder: 'desc',
    page: 1,
    pageSize: 20
  });

  // Debounced query
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Create debounced function
  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => {
      setDebouncedQuery(searchQuery);
    }, debounceMs),
    [debounceMs]
  );

  // Auto-search when debounced query changes
  useEffect(() => {
    if (autoSearch && debouncedQuery.trim()) {
      handleSearch(debouncedQuery);
    }
  }, [debouncedQuery, autoSearch]);

  // Load suggestions when query changes
  useEffect(() => {
    if (enableSuggestions && query.trim().length > 2) {
      loadSuggestions(query);
    } else {
      setSuggestions({ posts: [], materials: [] });
    }
  }, [query, enableSuggestions]);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const [materialCats, postCats] = await Promise.all([
        materialCategoryAPI.getTree(),
        postAPI.getCategories()
      ]);
      setCategories(materialCats);
      setPostCategories(postCats);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError('Failed to load categories');
    }
  };

  const loadSuggestions = async (searchQuery: string) => {
    try {
      const [posts, materials] = await Promise.all([
        getPostSuggestions(searchQuery, 5),
        getMaterialSuggestions(searchQuery, 5)
      ]);
      setSuggestions({ posts, materials });
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    }
  };

  const handleSearch = async (searchQuery?: string) => {
    const queryToSearch = searchQuery || query;
    if (!queryToSearch.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const request = { ...searchRequest, query: queryToSearch };
      const searchResults = await comprehensiveSearch(request);
      setResults(searchResults);
      setSearchRequest(request);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const setQuery = (newQuery: string) => {
    setQueryState(newQuery);
    debouncedSearch(newQuery);
  };

  const search = async (searchQuery?: string) => {
    await handleSearch(searchQuery);
  };

  const updateFilters = (filters: Partial<SearchRequest>) => {
    const newRequest = { ...searchRequest, ...filters };
    setSearchRequest(newRequest);

    // Auto-search if we have a query
    if (query.trim() && autoSearch) {
      setTimeout(() => handleSearch(query), 100);
    }
  };

  const clearResults = () => {
    setResults(null);
    setError(null);
    setSuggestions({ posts: [], materials: [] });
    setQuery('');
    setDebouncedQuery('');
  };

  return {
    // State
    query,
    results,
    loading,
    error,
    suggestions,
    categories,
    postCategories,

    // Actions
    setQuery,
    search,
    updateFilters,
    clearResults,
    loadCategories
  };
};

// Hook for search history
interface SearchHistoryItem {
  query: string;
  timestamp: Date;
  resultCount: number;
}

export const useSearchHistory = () => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    // Load history from localStorage
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })));
      } catch (err) {
        console.error('Failed to parse search history:', err);
      }
    }
  }, []);

  const addToHistory = (query: string, resultCount: number) => {
    const newItem: SearchHistoryItem = {
      query,
      timestamp: new Date(),
      resultCount
    };

    const updatedHistory = [newItem, ...history.filter(item => item.query !== query)].slice(0, 10);
    setHistory(updatedHistory);

    // Save to localStorage
    try {
      localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
    } catch (err) {
      console.error('Failed to save search history:', err);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('searchHistory');
  };

  const removeFromHistory = (query: string) => {
    const updatedHistory = history.filter(item => item.query !== query);
    setHistory(updatedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
  };

  return {
    history,
    addToHistory,
    clearHistory,
    removeFromHistory
  };
};

// Hook for saved searches
export const useSavedSearches = () => {
  const [savedSearches, setSavedSearches] = useState<SearchRequest[]>([]);

  useEffect(() => {
    // Load saved searches from localStorage
    const saved = localStorage.getItem('savedSearches');
    if (saved) {
      try {
        setSavedSearches(JSON.parse(saved));
      } catch (err) {
        console.error('Failed to parse saved searches:', err);
      }
    }
  }, []);

  const saveSearch = (searchRequest: SearchRequest, name?: string) => {
    const savedSearch = {
      ...searchRequest,
      id: Date.now().toString(),
      name: name || searchRequest.query,
      savedAt: new Date().toISOString()
    };

    const updated = [...savedSearches, savedSearch];
    setSavedSearches(updated);
    localStorage.setItem('savedSearches', JSON.stringify(updated));
  };

  const removeSavedSearch = (id: string) => {
    const updated = savedSearches.filter(search => search.id !== id);
    setSavedSearches(updated);
    localStorage.setItem('savedSearches', JSON.stringify(updated));
  };

  const executeSavedSearch = (savedSearch: any) => {
    const { id, name, savedAt, ...searchRequest } = savedSearch;
    return searchRequest;
  };

  return {
    savedSearches,
    saveSearch,
    removeSavedSearch,
    executeSavedSearch
  };
};

export default useSearch;
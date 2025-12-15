'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, BookOpen, MessageSquare, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { getPostSuggestions, getMaterialSuggestions } from '@/lib/api/searchAPI';
import { PostSuggestion, MaterialSuggestion } from '@/lib/types';
import { useSearchHistory } from '@/hooks/use-search';

interface SearchBoxProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
  showSuggestions?: boolean;
  autoFocus?: boolean;
}

export function SearchBox({
  placeholder = 'Search for anything...',
  onSearch,
  className,
  showSuggestions = true,
  autoFocus = false
}: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{
    posts: PostSuggestion[];
    materials: MaterialSuggestion[];
  }>({ posts: [], materials: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { history, addToHistory, removeFromHistory } = useSearchHistory();

  // Auto-focus if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Load suggestions when query changes
  useEffect(() => {
    if (query.trim().length > 2 && showSuggestions) {
      loadSuggestions();
    } else {
      setSuggestions({ posts: [], materials: [] });
    }
  }, [query, showSuggestions]);

  const loadSuggestions = async () => {
    if (!showSuggestions) return;

    setLoading(true);
    try {
      const [posts, materials] = await Promise.all([
        getPostSuggestions(query, 3),
        getMaterialSuggestions(query, 3)
      ]);
      setSuggestions({ posts, materials });
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (!finalQuery.trim()) return;

    // Add to history
    addToHistory(finalQuery, 0);

    // Close suggestions
    setIsOpen(false);
    setSuggestions({ posts: [], materials: [] });

    // Handle search
    if (onSearch) {
      onSearch(finalQuery);
    } else {
      // Navigate to search page
      router.push(`/search?q=${encodeURIComponent(finalQuery)}`);
    }
  };

  const handleSuggestionClick = (suggestion: PostSuggestion | MaterialSuggestion) => {
    setQuery(suggestion.title);
    handleSearch(suggestion.title);
  };

  const handleHistoryClick = (historyItem: { query: string }) => {
    setQuery(historyItem.query);
    handleSearch(historyItem.query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
      setIsOpen(false);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const trendingSearches = [
    'React hooks',
    'Machine learning',
    'Data structures',
    'Web development',
    'Algorithms'
  ];

  return (
    <div className={`relative ${className}`}>
      <Popover open={isOpen && showSuggestions} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsOpen(true)}
              className="pl-10 pr-10"
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
        </PopoverTrigger>

        {showSuggestions && (
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandList className="max-h-80">
                {/* Search Input */}
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="pl-8 border-none shadow-none focus-visible:ring-0"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Loading suggestions...
                  </div>
                )}

                {/* Suggestions */}
                {!loading && (suggestions.posts.length > 0 || suggestions.materials.length > 0) && (
                  <>
                    {suggestions.posts.length > 0 && (
                      <CommandGroup heading="Posts">
                        {suggestions.posts.map((post) => (
                          <CommandItem
                            key={post.id}
                            onSelect={() => handleSuggestionClick(post)}
                            className="flex items-center gap-2 p-2"
                          >
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="font-medium">{post.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {post.categories.join(', ')}
                              </div>
                            </div>
                            {post.isQuestion && (
                              <Badge variant="secondary" className="text-xs">Q</Badge>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {suggestions.materials.length > 0 && (
                      <CommandGroup heading="Study Materials">
                        {suggestions.materials.map((material) => (
                          <CommandItem
                            key={material.id}
                            onSelect={() => handleSuggestionClick(material)}
                            className="flex items-center gap-2 p-2"
                          >
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="font-medium">{material.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {material.category} • {material.type}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {material.type}
                            </Badge>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    <Separator />
                  </>
                )}

                {/* Search History */}
                {history.length > 0 && query.length === 0 && (
                  <CommandGroup heading="Recent Searches">
                    {history.slice(0, 5).map((item, index) => (
                      <CommandItem
                        key={index}
                        onSelect={() => handleHistoryClick(item)}
                        className="flex items-center gap-2 p-2"
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">{item.query}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromHistory(item.query);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Trending Searches */}
                {query.length === 0 && (
                  <CommandGroup heading="Trending">
                    {trendingSearches.map((trending, index) => (
                      <CommandItem
                        key={index}
                        onSelect={() => handleSearch(trending)}
                        className="flex items-center gap-2 p-2"
                      >
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span>{trending}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* No Results */}
                {!loading && query.length > 2 &&
                 suggestions.posts.length === 0 &&
                 suggestions.materials.length === 0 && (
                  <CommandEmpty>
                    <div className="text-center p-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        No suggestions found
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearch()}
                      >
                        Search for "{query}"
                      </Button>
                    </div>
                  </CommandEmpty>
                )}
              </CommandList>

              {/* Search Button */}
              <div className="p-3 border-t">
                <Button
                  onClick={() => handleSearch()}
                  disabled={!query.trim()}
                  className="w-full"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </Command>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}
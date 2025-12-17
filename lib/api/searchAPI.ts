import { fetchWrapper } from '@/lib/fetchWrapper';
import {
  SearchRequest,
  SearchResponse,
  PostSuggestion,
  MaterialSuggestion,
  SearchAnalytics,
  PostSearchResult,
  StudyMaterialSearchResult,
  ApiResponse
} from '@/lib/types';

// Search Engine API Functions

/**
 * Unified search endpoint with advanced filtering options (public)
 * POST /search
 */
export async function search(request: SearchRequest): Promise<SearchResponse> {
  const response = await fetchWrapper.post<SearchResponse>(
    `/search`,
    request
  );
  return response;
}


/**
 * Get post search suggestions
 * GET /search/posts/suggestions
 */
export async function getPostSuggestions(
  query: string,
  limit: number = 5
): Promise<PostSuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString()
  });

  const response = await fetchWrapper.get<PostSuggestion[]>(
    `/search/posts/suggestions?${params}`
  );
  return response;
}

/**
 * Get study material search suggestions
 * GET /search/materials/suggestions
 */
export async function getMaterialSuggestions(
  query: string,
  limit: number = 5
): Promise<MaterialSuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString()
  });

  const response = await fetchWrapper.get<MaterialSuggestion[]>(
    `/search/materials/suggestions?${params}`
  );
  return response;
}

// Admin Search Functions

/**
 * Reindex post content for search (Admin only)
 * POST /search/posts/{postId}/reindex
 */
export async function reindexPost(postId: string): Promise<ApiResponse<void>> {
  const response = await fetchWrapper.post<ApiResponse<void>>(
    `/search/posts/${postId}/reindex`
  );
  return response;
}

/**
 * Reindex study material content for search (Admin only)
 * POST /search/materials/{materialId}/reindex
 */
export async function reindexMaterial(materialId: string): Promise<ApiResponse<void>> {
  const response = await fetchWrapper.post<ApiResponse<void>>(
    `/search/materials/${materialId}/reindex`
  );
  return response;
}

/**
 * Get search analytics (Admin only)
 * GET /search/analytics
 */
export async function getSearchAnalytics(
  fromDate?: string,
  toDate?: string
): Promise<SearchAnalytics> {
  const params = new URLSearchParams();

  if (fromDate) {
    params.set('from', fromDate);
  }

  if (toDate) {
    params.set('to', toDate);
  }

  const url = params.toString()
    ? `/search/analytics?${params}`
    : `/search/analytics`;

  const response = await fetchWrapper.get<SearchAnalytics>(url);
  return response;
}

// Search Utility Functions

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Format query time for display
 */
export function formatQueryTime(queryTime: string): string {
  // Parse "HH:mm:ss.fff" format and return human readable
  const [hours, minutes, secondsAndMs] = queryTime.split(':');
  const [seconds, milliseconds] = secondsAndMs.split('.');

  const totalSeconds = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);

  if (totalSeconds < 1) {
    return `${parseInt(milliseconds)}ms`;
  } else if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  } else {
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Get search result type label
 */
export function getResultTypeLabel(type: string): string {
  const typeLabels: Record<string, string> = {
    'PDF': 'PDF Document',
    'DOC': 'Word Document',
    'DOCX': 'Word Document',
    'PPT': 'PowerPoint',
    'PPTX': 'PowerPoint',
    'XLS': 'Excel',
    'XLSX': 'Excel',
    'TXT': 'Text File',
    'URL': 'Web Link',
    'VIDEO': 'Video',
    'AUDIO': 'Audio'
  };

  return typeLabels[type] || type;
}

/**
 * Get relevance score color class
 */
export function getRelevanceScoreColor(score: number): string {
  if (score >= 0.9) return 'text-green-600';
  if (score >= 0.7) return 'text-yellow-600';
  if (score >= 0.5) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Format relevance score as percentage
 */
export function formatRelevanceScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * Get match type badge style
 */
export function getMatchTypeStyle(matchType: string): string {
  const styles = {
    'Exact': 'bg-blue-100 text-blue-800',
    'Semantic': 'bg-green-100 text-green-800',
    'Keyword': 'bg-purple-100 text-purple-800',
    'Fuzzy': 'bg-orange-100 text-orange-800'
  };

  return styles[matchType as keyof typeof styles] || 'bg-gray-100 text-gray-800';
}

/**
 * Highlight search terms in text
 */
export function highlightText(
  text: string,
  query: string,
  className: string = 'bg-yellow-200'
): string {
  if (!query || !text) return text;

  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return text.replace(regex, `<mark class="${className}">$1</mark>`);
}

/**
 * Escape special characters in regex
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
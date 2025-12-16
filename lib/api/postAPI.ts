import { fetchWrapper } from '@/lib/fetchWrapper';
import type { PostRequestDto, PostResponseDto, PageResult } from '@/lib/types';

export const postAPI = {
  // Get all posts with pagination and filtering
  getAll: async (params?: {
    page?: number;
    pageSize?: number;
    categoryIds?: string[];
    isQuestion?: boolean;
  }): Promise<PageResult<PostResponseDto>> => {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.categoryIds && params.categoryIds.length > 0) {
      queryParams.append('categoryIds', params.categoryIds.join(','));
    }
    if (params?.isQuestion !== undefined) {
      queryParams.append('isQuestion', params.isQuestion.toString());
    }

    const queryString = queryParams.toString();
    const url = `/post${queryString ? `?${queryString}` : ''}`;

    return fetchWrapper.get<PageResult<PostResponseDto>>(url);
  },

  // Get post by ID
  getById: async (id: string): Promise<PostResponseDto> =>
    fetchWrapper.get<PostResponseDto>(`/post/${id}`),

  // Get posts by user (using search API for better functionality)
  getByUser: async (userId: string, params?: {
    page?: number;
    pageSize?: number;
  }): Promise<PageResult<PostResponseDto>> => {
    // This would need to be implemented in backend or use search API
    // For now, using the existing endpoint
    return fetchWrapper.get<PostResponseDto[]>(`/post/by-user/${userId}`).then(posts => ({
      total: posts.length,
      page: params?.page || 1,
      pageSize: params?.pageSize || 10,
      items: posts
    }));
  },

  // Create new post
  create: async (payload: PostRequestDto): Promise<PostResponseDto> =>
    fetchWrapper.post<PostResponseDto>(`/post`, payload),

  // Update post
  update: async (id: string, payload: Partial<PostRequestDto>): Promise<PostResponseDto> =>
    fetchWrapper.put<PostResponseDto>(`/post/${id}`, payload),

  // Delete post
  delete: async (id: string): Promise<void> =>
    fetchWrapper.del<void>(`/post/${id}`),

  // Get post categories
  getCategories: async (): Promise<{ id: string; name: string }[]> => {
    return fetchWrapper.get(`/post/categories`);
  },

  // Get recommended posts
  getRecommendations: async (limit?: number): Promise<PostResponseDto[]> => {
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit.toString());

    const queryString = queryParams.toString();
    const url = `/post/recommendations${queryString ? `?${queryString}` : ''}`;

    return fetchWrapper.get<PostResponseDto[]>(url);
  }
};

// Legacy compatibility functions
export const postAPILegacy = {
  getAll: async (): Promise<PostResponseDto[]> => {
    const result = await postAPI.getAll({ page: 1, pageSize: 100 });
    return result.items;
  },

  getById: async (id: string): Promise<PostResponseDto> =>
    postAPI.getById(id),

  getByUser: async (userId: string): Promise<PostResponseDto[]> => {
    const result = await postAPI.getByUser(userId, { page: 1, pageSize: 100 });
    return result.items;
  },

  create: async (payload: PostRequestDto): Promise<PostResponseDto> =>
    postAPI.create(payload),

  update: async (id: string, payload: Partial<PostRequestDto>): Promise<PostResponseDto> =>
    postAPI.update(id, payload),

  delete: async (id: string): Promise<void> =>
    postAPI.delete(id),
};

import { fetchWrapper } from '@/lib/fetchWrapper';
import type { PostRequestDto, PostResponseDto, PageResult } from '@/lib/types';

export const postAPI = {
  // Get all posts with filtering
  getAll: async (params?: {
    isQuestion?: boolean;
    status?: 'Accepted' | 'Pending' | 'Rejected';
    includeAll?: boolean; // For admin to see all statuses
    categoryId?: string;
  }): Promise<PageResult<PostResponseDto>> => {
    const queryParams = new URLSearchParams();

    if (params?.isQuestion !== undefined) {
      queryParams.append('isQuestion', params.isQuestion.toString());
    }

    if (params?.categoryId) {
      queryParams.append('categoryId', params.categoryId);
    }
    // Add status filter if specified (default to Accepted)
    if (params?.includeAll) {
      // Don't filter by status
    } else if (params?.status) {
      queryParams.append('status', params.status);
    } else {
      queryParams.append('status', 'Accepted'); // Default to showing only accepted posts
    }

    const queryString = queryParams.toString();
    const url = `/post${queryString ? `?${queryString}` : ''}`;

    return fetchWrapper.get<PageResult<PostResponseDto>>(url);
  },

  // Get post by ID
  getById: async (id: string): Promise<PostResponseDto> =>
    fetchWrapper.get<PostResponseDto>(`/post/${id}`),

  // Get posts by user (using search API for better functionality)
  getByUser: async (userId: string): Promise<PageResult<PostResponseDto>> => {
    // Handle both array (legacy) and PageResult (new) responses
    const response = await fetchWrapper.get<any>(`/post/by-user/${userId}`);

    if (Array.isArray(response)) {
      return {
        total: response.length,
        page: 1,
        pageSize: response.length,
        items: response
      };
    }

    // If it's already a PageResult structure
    if (response && Array.isArray(response.items)) {
      return response;
    }

    // Fallback for unexpected structure - assume it's the array itself
    return {
      total: Array.isArray(response) ? response.length : 0,
      page: 1,
      pageSize: Array.isArray(response) ? response.length : 0,
      items: Array.isArray(response) ? response : []
    };
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
    return fetchWrapper.get(`/category`);
  },

  // Get recommended posts (using the backend recommendations endpoint)
  getRecommendations: async (limit?: number, status?: 'Accepted' | 'Pending' | 'Rejected'): Promise<PostResponseDto[]> => {
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit.toString());
    if (status) queryParams.append('status', status);

    const queryString = queryParams.toString();
    const url = `/post/recommendations${queryString ? `?${queryString}` : ''}`;

    return fetchWrapper.get<PostResponseDto[]>(url);
  },

  // Admin: Update post status
  updateStatus: async (postId: string, status: 'Accepted' | 'Pending' | 'Rejected', adminNote?: string): Promise<void> => {
    return fetchWrapper.put(`/post/${postId}/status`, {
      status,
      adminNote
    });
  },

  // Admin: Get pending posts
  getPendingPosts: async (): Promise<PostResponseDto[]> => {
    return fetchWrapper.get('/post/admin/pending');
  }
};

// Legacy compatibility functions
export const postAPILegacy = {
  getAll: async (): Promise<PostResponseDto[]> => {
    const result = await postAPI.getAll({});
    return result.items;
  },

  getById: async (id: string): Promise<PostResponseDto> =>
    postAPI.getById(id),

  getByUser: async (userId: string): Promise<PostResponseDto[]> => {
    const result = await postAPI.getByUser(userId);
    return result.items;
  },

  create: async (payload: PostRequestDto): Promise<PostResponseDto> =>
    postAPI.create(payload),

  update: async (id: string, payload: Partial<PostRequestDto>): Promise<PostResponseDto> =>
    postAPI.update(id, payload),

  delete: async (id: string): Promise<void> =>
    postAPI.delete(id),
};

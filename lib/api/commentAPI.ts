import { fetchWrapper } from '@/lib/fetchWrapper';
import type { CommentResponseDto, CommentRequestDto, PageResult } from '@/lib/types';

export const commentAPI = {
  // Get comments by post with pagination
  getByPost: async (postId: string, params?: {
    page?: number;
    pageSize?: number;
  }): Promise<PageResult<CommentResponseDto>> => {
    const queryParams = new URLSearchParams();

    // Set default values
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;

    queryParams.append('page', page.toString());
    queryParams.append('pageSize', pageSize.toString());

    const queryString = queryParams.toString();
    const url = `/comment/by-post/${postId}${queryString ? `?${queryString}` : ''}`;

    return fetchWrapper.get<PageResult<CommentResponseDto>>(url);
  },

  // Legacy method for backward compatibility - gets first page
  getByPostLegacy: async (postId: string): Promise<CommentResponseDto[]> => {
    const result = await commentAPI.getByPost(postId);
    return result.items;
  },

  create: async (payload: CommentRequestDto): Promise<CommentResponseDto> =>
    fetchWrapper.post('/comment', payload),

  update: async (id: string, payload: Partial<CommentRequestDto>): Promise<CommentResponseDto> =>
    fetchWrapper.put(`/comment/${id}`, payload),

  delete: async (id: string): Promise<void> => fetchWrapper.del(`/comment/${id}`),
};

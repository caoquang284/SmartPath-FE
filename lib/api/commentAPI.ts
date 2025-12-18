import { fetchWrapper } from '@/lib/fetchWrapper';
import type { CommentResponseDto, CommentRequestDto, PageResult } from '@/lib/types';

export const commentAPI = {
  // Get all comments by post (backend doesn't use pagination)
  getByPost: async (postId: string): Promise<CommentResponseDto[]> => {
    const url = `/comment/by-post/${postId}`;
    return fetchWrapper.get<CommentResponseDto[]>(url);
  },

  // Legacy method for backward compatibility - same as getByPost
  getByPostLegacy: async (postId: string): Promise<CommentResponseDto[]> => {
    return commentAPI.getByPost(postId);
  },

  create: async (payload: CommentRequestDto): Promise<CommentResponseDto> =>
    fetchWrapper.post('/comment', payload),

  update: async (id: string, payload: Partial<CommentRequestDto>): Promise<CommentResponseDto> =>
    fetchWrapper.put(`/comment/${id}`, payload),

  delete: async (id: string): Promise<void> => fetchWrapper.del(`/comment/${id}`),
};

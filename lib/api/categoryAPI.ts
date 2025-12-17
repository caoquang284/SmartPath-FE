// src/lib/api/categoryAPI.ts
import { fetchWrapper } from '@/lib/fetchWrapper';
import type { CategoryRequestDto, CategoryResponseDto } from '@/lib/types';

export type CategoryDto = { id: string; name: string };

export const categoryAPI = {
  getAll: async (): Promise<CategoryResponseDto[]> => {
    try {
      return await fetchWrapper.get<CategoryResponseDto[]>('/category');
    } catch {
      return [];
    }
  },

  getById: async (id: string): Promise<CategoryResponseDto | null> => {
    try {
      return await fetchWrapper.get<CategoryResponseDto>(`/category/${id}`);
    } catch {
      return null;
    }
  },

  create: async (payload: CategoryRequestDto): Promise<CategoryResponseDto> => {
    return fetchWrapper.post<CategoryResponseDto>('/category', payload);
  },

  update: async (id: string, payload: CategoryRequestDto): Promise<CategoryResponseDto> => {
    return fetchWrapper.put<CategoryResponseDto>(`/category/${id}`, payload);
  },

  delete: async (id: string): Promise<void> => {
    return fetchWrapper.del<void>(`/category/${id}`);
  }
};
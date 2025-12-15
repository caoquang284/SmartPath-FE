import { fetchWrapper } from '@/lib/fetchWrapper';
import {
  MaterialCategory,
  StudyMaterialResponse,
  StudyMaterialCreateRequest,
  StudyMaterialSearchRequest,
  StudyMaterialSearchResponse,
  StudyMaterialReviewRequest,
  MaterialPageResult,
  SourceType,
  MaterialCategoryCreateRequest,
  MaterialCategoryUpdateRequest,
  MoveCategoryRequest
} from '@/lib/types';

export const materialCategoryAPI = {
  // Get category tree
  getTree: async (): Promise<MaterialCategory[]> => {
    return fetchWrapper.get<MaterialCategory[]>('/MaterialCategory/tree', false);
  },

  // Create new category
  create: async (data: MaterialCategoryCreateRequest): Promise<MaterialCategory> => {
    return fetchWrapper.post<MaterialCategory>('/MaterialCategory', data);
  },

  // Update category
  update: async (id: string, data: MaterialCategoryUpdateRequest): Promise<MaterialCategory> => {
    return fetchWrapper.put<MaterialCategory>(`/MaterialCategory/${id}`, data);
  },

  // Move category (change parent and/or sort order)
  move: async (id: string, data: MoveCategoryRequest): Promise<void> => {
    return fetchWrapper.put<void>(`/MaterialCategory/${id}/move`, data);
  },

  // Delete category
  delete: async (id: string): Promise<void> => {
    return fetchWrapper.del<void>(`/MaterialCategory/${id}`);
  }
};

export const studyMaterialAPI = {
  // Search materials (public library browsing)
  search: async (params: StudyMaterialSearchRequest): Promise<StudyMaterialSearchResponse> => {
    const queryParams = new URLSearchParams();

    if (params.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params.status !== undefined) queryParams.append('status', params.status.toString());
    if (params.q) queryParams.append('q', params.q);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());

    const queryString = queryParams.toString();
    const url = `/StudyMaterial/search${queryString ? `?${queryString}` : ''}`;

    return fetchWrapper.get<StudyMaterialSearchResponse>(url, false);
  },

  // Get material detail
  getById: async (id: string): Promise<StudyMaterialResponse> => {
    return fetchWrapper.get<StudyMaterialResponse>(`/StudyMaterial/${id}`, false);
  },

  // Create new study material (upload)
  create: async (
    data: StudyMaterialCreateRequest,
    file?: File | null,
    onProgress?: (percent: number) => void
  ): Promise<StudyMaterialResponse> => {
    const formData = new FormData();

    // Add metadata
    formData.append('meta.categoryId', data.categoryId);
    formData.append('meta.title', data.title);
    if (data.description) {
      formData.append('meta.description', data.description);
    }
    formData.append('meta.sourceType', data.sourceType.toString());

    if (data.sourceType === SourceType.Url && data.sourceUrl) {
      formData.append('meta.sourceUrl', data.sourceUrl);
    }

    // Add file if uploading file
    if (data.sourceType === SourceType.File && file) {
      formData.append('file', file);
    }

    // Use the form upload with progress if progress callback provided
    if (onProgress && data.sourceType === SourceType.File) {
      return fetchWrapper.postFormWithProgress<StudyMaterialResponse>(
        '/StudyMaterial',
        formData,
        onProgress
      );
    }

    // Regular form post
    return fetchWrapper.postForm<StudyMaterialResponse>('/StudyMaterial', formData);
  },

  // Get my uploaded materials
  getMine: async (
    status?: number,
    page: number = 1,
    pageSize: number = 20
  ): Promise<MaterialPageResult<StudyMaterialResponse>> => {
    const queryParams = new URLSearchParams();
    if (status !== undefined) queryParams.append('status', status.toString());
    queryParams.append('page', page.toString());
    queryParams.append('pageSize', pageSize.toString());

    const queryString = queryParams.toString();
    const url = `/StudyMaterial/mine${queryString ? `?${queryString}` : ''}`;

    return fetchWrapper.get<MaterialPageResult<StudyMaterialResponse>>(url);
  },

  // Admin: Review material (override AI)
  review: async (id: string, reviewData: StudyMaterialReviewRequest): Promise<void> => {
    return fetchWrapper.put<void>(`/StudyMaterial/${id}/review`, reviewData);
  }
};
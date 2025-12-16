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
  MoveCategoryRequest,
  ApiResponse,
  StudyMaterialRatingRequest,
  StudyMaterialRatingResponse,
  StudyMaterialRatingStats
} from '@/lib/types';

export const materialCategoryAPI = {
  // Get category tree
  getTree: async (): Promise<MaterialCategory[]> => {
    return fetchWrapper.get<MaterialCategory[]>(`/materialcategory/tree`);
  },

  // Create new category (Admin only)
  create: async (data: MaterialCategoryCreateRequest): Promise<MaterialCategory> => {
    return fetchWrapper.post<MaterialCategory>(`/materialcategory`, data);
  },

  // Update category (Admin only)
  update: async (id: string, data: MaterialCategoryUpdateRequest): Promise<MaterialCategory> => {
    return fetchWrapper.put<MaterialCategory>(`/materialcategory/${id}`, data);
  },

  // Move category (change parent and/or sort order) (Admin only)
  move: async (id: string, data: MoveCategoryRequest): Promise<void> => {
    return fetchWrapper.post<void>(`/materialcategory/${id}/move`, data);
  },

  // Delete category (Admin only)
  delete: async (id: string): Promise<void> => {
    return fetchWrapper.del<void>(`/materialcategory/${id}`);
  }
};

export const studyMaterialAPI = {
  // Search study materials (public library browsing)
  search: async (params?: {
    page?: number;
    pageSize?: number;
    categoryId?: string;
    status?: 0 | 1 | 2; // Using enum values: 0=Pending, 1=Accepted, 2=Rejected
    q?: string;
  }): Promise<{ items: StudyMaterialResponse[]; total: number; page: number; pageSize: number }> => {
    const queryParams = new URLSearchParams();

    // Set default values
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;

    queryParams.append('page', page.toString());
    queryParams.append('pageSize', pageSize.toString());

    if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params?.status !== undefined) queryParams.append('status', params.status.toString());
    if (params?.q) queryParams.append('q', params.q);

    const queryString = queryParams.toString();
    const url = `/studymaterial/search${queryString ? `?${queryString}` : ''}`;

    return fetchWrapper.get(url);
  },

  // Get study material by ID
  getById: async (id: string): Promise<StudyMaterialResponse> => {
    return fetchWrapper.get<StudyMaterialResponse>(`/studymaterial/${id}`);
  },

  // Rating endpoints
  ratings: {
    // Get rating statistics for a material
    getStats: async (materialId: string): Promise<StudyMaterialRatingStats> => {
      return fetchWrapper.get<StudyMaterialRatingStats>(`/studymaterial/${materialId}/ratings/stats`);
    },

    // Rate a material (create or update)
    rate: async (materialId: string, data: StudyMaterialRatingRequest): Promise<StudyMaterialRatingResponse> => {
      return fetchWrapper.post<StudyMaterialRatingResponse>(`/studymaterial/${materialId}/ratings`, data);
    },

    // Get all ratings for a material (paginated)
    getAll: async (materialId: string, params?: {
      page?: number;
      pageSize?: number;
    }): Promise<{ items: StudyMaterialRatingResponse[]; total: number; page: number; pageSize: number }> => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());

      const queryString = queryParams.toString();
      const url = `/studymaterial/${materialId}/ratings${queryString ? `?${queryString}` : ''}`;

      return fetchWrapper.get(url);
    },

    // Get current user's rating for a material
    getMyRating: async (materialId: string): Promise<StudyMaterialRatingResponse | null> => {
      try {
        return await fetchWrapper.get<StudyMaterialRatingResponse>(`/studymaterial/${materialId}/ratings/my`);
      } catch (error: any) {
        if (error.code === 404) {
          return null;
        }
        throw error;
      }
    },

    // Delete user's rating for a material
    delete: async (materialId: string): Promise<void> => {
      return fetchWrapper.del<void>(`/studymaterial/${materialId}/ratings`);
    }
  },

  // Create/upload study material (file-based or URL)
  create: async (
    meta: {
      title: string;
      description?: string;
      categoryId: string;
      sourceUrl?: string;
      sourceType?: SourceType;
    },
    file?: File | null,
    onProgress?: (percent: number) => void
  ): Promise<StudyMaterialResponse> => {
    const formData = new FormData();

    // Add metadata as form field (matching backend expectation)
    formData.append('meta.title', meta.title);
    if (meta.description) {
      formData.append('meta.description', meta.description);
    }
    formData.append('meta.categoryId', meta.categoryId);
    if (meta.sourceUrl) {
      formData.append('meta.sourceUrl', meta.sourceUrl);
    }
    if (meta.sourceType !== undefined) {
      formData.append('meta.sourceType', meta.sourceType.toString());
    }

    // Add file if provided
    if (file) {
      formData.append('file', file);
    }

    if (onProgress && file) {
      return fetchWrapper.postFormWithProgress<StudyMaterialResponse>(
        `/studymaterial`,
        formData,
        onProgress
      );
    }

    return fetchWrapper.postForm<StudyMaterialResponse>(`/studymaterial`, formData);
  },

  // Get user's study materials
  getMine: async (params?: {
    page?: number;
    pageSize?: number;
    status?: 0 | 1 | 2; // Using enum values: 0=Pending, 1=Accepted, 2=Rejected
  }): Promise<{ items: StudyMaterialResponse[]; total: number; page: number; pageSize: number }> => {
    const queryParams = new URLSearchParams();

    // Set default values
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;

    queryParams.append('page', page.toString());
    queryParams.append('pageSize', pageSize.toString());

    if (params?.status !== undefined) queryParams.append('status', params.status.toString());

    const queryString = queryParams.toString();
    const url = `/studymaterial/mine${queryString ? `?${queryString}` : ''}`;

    return fetchWrapper.get(url);
  },

  // Admin: Review study material
  review: async (id: string, reviewData: StudyMaterialReviewRequest): Promise<void> => {
    return fetchWrapper.put(`/studymaterial/${id}/review`, reviewData);
  }
};

// Legacy compatibility functions
export const studyMaterialLegacy = {
  // Search materials (public library browsing) - for backward compatibility
  search: async (params: StudyMaterialSearchRequest): Promise<StudyMaterialSearchResponse> => {
    const queryParams = new URLSearchParams();

    if (params.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params.status !== undefined) queryParams.append('status', params.status.toString());
    if (params.q) queryParams.append('q', params.q);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());

    const queryString = queryParams.toString();
    const url = `/studymaterial/search${queryString ? `?${queryString}` : ''}`;

    const result = await fetchWrapper.get<{
      items: StudyMaterialResponse[];
      total: number;
      page: number;
      pageSize: number;
    }>(url);

    // Convert to legacy format
    return {
      items: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize
    };
  },

  // Get material detail - for backward compatibility
  getById: async (id: string): Promise<StudyMaterialResponse> => {
    return studyMaterialAPI.getById(id);
  },

  // Create new study material (upload) - for backward compatibility
  create: async (
    data: StudyMaterialCreateRequest,
    file?: File | null,
    onProgress?: (percent: number) => void
  ): Promise<StudyMaterialResponse> => {
    return studyMaterialAPI.create({
      title: data.title,
      description: data.description,
      categoryId: data.categoryId,
      sourceType: data.sourceType,
      sourceUrl: data.sourceUrl
    }, file, onProgress);
  },

  // Get my uploaded materials - for backward compatibility
  getMine: async (
    status?: number,
    page: number = 1,
    pageSize: number = 20
  ): Promise<MaterialPageResult<StudyMaterialResponse>> => {
    // For backward compatibility, we need to support page parameters
    // But we'll use the paginated version
    const result = await studyMaterialAPI.getMinePaginated({
      page,
      pageSize,
      status: status !== undefined ? status as 0 | 1 | 2 : undefined
    });

    // Convert to legacy format
    return {
      items: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize
    };
  },

  // Admin: Review material (override AI) - for backward compatibility
  review: async (id: string, reviewData: StudyMaterialReviewRequest): Promise<void> => {
    return studyMaterialAPI.review(id, reviewData);
  }
};
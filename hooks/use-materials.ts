import { useState, useEffect, useCallback } from 'react';
import { studyMaterialAPI, materialCategoryAPI } from '@/lib/api/studyMaterialAPI';
import { MaterialCategory, StudyMaterialResponse, MaterialPageResult } from '@/lib/types';

interface UseMaterialsOptions {
  autoLoad?: boolean;
  pageSize?: number;
  defaultStatus?: 'Pending' | 'Approved' | 'Rejected';
}

interface UseMaterialsReturn {
  // State
  materials: StudyMaterialResponse[];
  categories: MaterialCategory[];
  loading: boolean;
  error: string | null;

  // Pagination
  currentPage: number;
  totalPages: number;
  totalCount: number;

  // Filters
  categoryId: string | null;
  status: 'Pending' | 'Approved' | 'Rejected' | null;
  searchQuery: string;

  // Actions
  loadMaterials: (page?: number) => Promise<void>;
  loadCategories: () => Promise<void>;
  setCategoryFilter: (categoryId: string | null) => void;
  setStatusFilter: (status: 'Pending' | 'Approved' | 'Rejected' | null) => void;
  setSearchQuery: (query: string) => void;
  refresh: () => Promise<void>;
  uploadMaterial: (file: File, metadata: {
    title: string;
    description?: string;
    categoryId: string;
  }, onProgress?: (percent: number) => void) => Promise<StudyMaterialResponse>;
  addMaterialFromUrl: (metadata: {
    title: string;
    description?: string;
    categoryId: string;
    sourceUrl: string;
  }) => Promise<StudyMaterialResponse>;
  deleteMaterial: (id: string) => Promise<void>;
  reviewMaterial: (id: string, decision: 'Accepted' | 'Rejected', reason?: string) => Promise<void>;
}

export const useMaterials = (options: UseMaterialsOptions = {}): UseMaterialsReturn => {
  const {
    autoLoad = true,
    pageSize = 20,
    defaultStatus = 'Approved'
  } = options;

  // State
  const [materials, setMaterials] = useState<StudyMaterialResponse[]>([]);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [status, setStatus] = useState<'Pending' | 'Approved' | 'Rejected' | null>(defaultStatus);
  const [searchQuery, setSearchQueryState] = useState('');

  const loadMaterials = useCallback(async (page: number = 1) => {
    setLoading(true);
    setError(null);

    // Convert status to numeric if needed
    const statusMap: Record<string, 0 | 1 | 2> = {
      'Pending': 0,
      'Accepted': 1,
      'Approved': 1,
      'Rejected': 2
    };

      try {
      const response = await studyMaterialAPI.search({
        page,
        pageSize,
        categoryId: categoryId || undefined,
        status: status ? statusMap[status] : undefined,
        q: searchQuery || undefined
      });

      setMaterials(response.items);
      setCurrentPage(page);
      setTotalPages(Math.ceil(response.total / pageSize));
      setTotalCount(response.total);
    } catch (err) {
      console.error('Failed to load materials:', err);
      setError('Failed to load materials');
      setMaterials([]);
      setTotalPages(0);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [categoryId, status, searchQuery, pageSize]);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await materialCategoryAPI.getTree();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError('Failed to load categories');
    }
  }, []);

  const setCategoryFilter = useCallback((newCategoryId: string | null) => {
    setCategoryId(newCategoryId);
    setCurrentPage(1); // Reset to first page
  }, []);

  const setStatusFilter = useCallback((newStatus: 'Pending' | 'Approved' | 'Rejected' | null) => {
    setStatus(newStatus);
    setCurrentPage(1); // Reset to first page
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
    setCurrentPage(1); // Reset to first page
  }, []);

  const refresh = useCallback(async () => {
    await loadMaterials(currentPage);
  }, [loadMaterials, currentPage]);

  const uploadMaterial = useCallback(async (
    file: File,
    metadata: {
      title: string;
      description?: string;
      categoryId: string;
    },
    onProgress?: (percent: number) => void
  ): Promise<StudyMaterialResponse> => {
    try {
      const material = await studyMaterialAPI.create(metadata, file, onProgress);

      // Refresh the list if successful
      if (material) {
        await refresh();
      }

      return material;
    } catch (err) {
      console.error('Failed to upload material:', err);
      setError('Failed to upload material');
      throw err;
    }
  }, [refresh]);

  const addMaterialFromUrl = useCallback(async (metadata: {
    title: string;
    description?: string;
    categoryId: string;
    sourceUrl: string;
  }): Promise<StudyMaterialResponse> => {
    try {
      const material = await studyMaterialAPI.create(metadata);

      // Refresh the list if successful
      if (material) {
        await refresh();
      }

      return material;
    } catch (err) {
      console.error('Failed to add material from URL:', err);
      setError('Failed to add material from URL');
      throw err;
    }
  }, [refresh]);

  // Note: delete functionality is not available in the backend controller yet
  const deleteMaterial = useCallback(async (id: string): Promise<void> => {
    throw new Error('Delete functionality is not available in the backend yet');
  }, []);

  const reviewMaterial = useCallback(async (
    id: string,
    decision: 'Accepted' | 'Rejected',
    reason?: string
  ): Promise<void> => {
    try {
      await studyMaterialAPI.review(id, { decision, reason });
      await refresh();
    } catch (err) {
      console.error('Failed to review material:', err);
      setError('Failed to review material');
      throw err;
    }
  }, [refresh]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadMaterials();
      loadCategories();
    }
  }, [autoLoad]); // Only run on mount

  // Reload when filters change
  useEffect(() => {
    if (autoLoad) {
      loadMaterials(1);
    }
  }, [categoryId, status, searchQuery, autoLoad, loadMaterials]);

  return {
    // State
    materials,
    categories,
    loading,
    error,

    // Pagination
    currentPage,
    totalPages,
    totalCount,

    // Filters
    categoryId,
    status,
    searchQuery,

    // Actions
    loadMaterials,
    loadCategories,
    setCategoryFilter,
    setStatusFilter,
    setSearchQuery,
    refresh,
    uploadMaterial,
    addMaterialFromUrl,
    deleteMaterial,
    reviewMaterial
  };
};

// Hook for user's materials
export const useMyMaterials = (options: UseMaterialsOptions = {}) => {
  const baseMaterials = useMaterials({
    ...options,
    autoLoad: false // We'll handle loading manually
  });

  const [materials, setMaterials] = useState<StudyMaterialResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const loadMyMaterials = useCallback(async (page: number = 1) => {
    setLoading(true);
    setError(null);

    // Convert status to numeric if needed
    const statusMap: Record<string, 0 | 1 | 2> = {
      'Pending': 0,
      'Accepted': 1,
      'Approved': 1,
      'Rejected': 2
    };

    try {
      const response = await studyMaterialAPI.getMine({
        page,
        pageSize: options.pageSize || 20,
        status: options.defaultStatus ? statusMap[options.defaultStatus] : undefined
      });

      setMaterials(response.items);
      setCurrentPage(page);
      setTotalPages(Math.ceil(response.total / (options.pageSize || 20)));
      setTotalCount(response.total);
    } catch (err) {
      console.error('Failed to load my materials:', err);
      setError('Failed to load your materials');
      setMaterials([]);
      setTotalPages(0);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [options.pageSize, options.defaultStatus]);

  return {
    materials,
    loading,
    error,
    currentPage,
    totalPages,
    totalCount,
    loadMaterials: loadMyMaterials,
    loadCategories: baseMaterials.loadCategories,
    reviewMaterial: baseMaterials.reviewMaterial
  };
};

export default useMaterials;
import { fetchWrapper } from '@/lib/fetchWrapper';
import type {
    KnowledgeDocumentDto,
    KnowledgeDocumentUpdateRequest,
    KnowledgeListResult,
    KnowledgeTextIngestRequest,
    KnowledgeUrlIngestRequest,
    KnowledgePreviewResultDto
} from '@/lib/types';


export const knowledgeAPI = {
    ingestText: async (payload: KnowledgeTextIngestRequest): Promise<{ documentId: string }> =>
        fetchWrapper.post('/knowledge/ingest/text', payload),


    ingestUrl: async (payload: KnowledgeUrlIngestRequest): Promise<{ documentId: string }> =>
        fetchWrapper.post('/knowledge/ingest/url', payload),


    ingestFiles: async (
        files: File[],
        opts?: { title?: string; sourceUrl?: string | null }
    ): Promise<Array<{ file: string; documentId: string }>> => {
        const form = new FormData();
        if (opts?.title) form.append('Title', opts.title);
        if (typeof opts?.sourceUrl === 'string') form.append('SourceUrl', opts.sourceUrl);
        files.forEach((f) => form.append('Files', f));
        return fetchWrapper.postForm('/knowledge/ingest/files', form);
    },

    async previewText(body: { title: string; sourceUrl?: string; text: string }): Promise<KnowledgePreviewResultDto> {
        return fetchWrapper.post('/knowledge/preview/text', body);
    },

    async previewUrl(body: { url: string; title?: string }): Promise<KnowledgePreviewResultDto> {
        return fetchWrapper.post('/knowledge/preview/url', body);
    },

    async previewFiles(
        files: File[],
        meta: { title?: string; sourceUrl?: string }
    ): Promise<KnowledgePreviewResultDto[]> {
        const form = new FormData();
        if (meta.title) form.append('Title', meta.title);
        if (meta.sourceUrl) form.append('SourceUrl', meta.sourceUrl);
        files.forEach((f) => form.append('Files', f));
        return fetchWrapper.post('/knowledge/preview/files', form);
    },


    listDocuments: async (page = 1, pageSize = 20, q?: string): Promise<KnowledgeListResult> =>
        fetchWrapper.get(`/knowledge/documents?page=${page}&pageSize=${pageSize}${q ? `&q=${encodeURIComponent(q)}` : ''}`),


    getDocument: async (id: string): Promise<KnowledgeDocumentDto> =>
        fetchWrapper.get(`/knowledge/documents/${id}`),


    updateDocument: async (id: string, payload: KnowledgeDocumentUpdateRequest): Promise<void> =>
        fetchWrapper.put(`/knowledge/documents/${id}`, payload),


    deleteDocument: async (id: string): Promise<void> =>
        fetchWrapper.del(`/knowledge/documents/${id}`),
};
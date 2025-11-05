import { fetchWrapper } from '@/lib/fetchWrapper';
import type {
KnowledgeDocumentDto,
KnowledgeDocumentUpdateRequest,
KnowledgeListResult,
KnowledgeTextIngestRequest,
KnowledgeUrlIngestRequest,
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


listDocuments: async (page = 1, pageSize = 20, q?: string): Promise<KnowledgeListResult> =>
fetchWrapper.get(`/knowledge/documents?page=${page}&pageSize=${pageSize}${q ? `&q=${encodeURIComponent(q)}` : ''}`),


getDocument: async (id: string): Promise<KnowledgeDocumentDto> =>
fetchWrapper.get(`/knowledge/documents/${id}`),


updateDocument: async (id: string, payload: KnowledgeDocumentUpdateRequest): Promise<void> =>
fetchWrapper.put(`/knowledge/documents/${id}`, payload),


deleteDocument: async (id: string): Promise<void> =>
fetchWrapper.del(`/knowledge/documents/${id}`),
};
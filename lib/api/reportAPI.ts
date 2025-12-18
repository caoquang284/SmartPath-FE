import { fetchWrapper } from '@/lib/fetchWrapper';
import { ReportRequestDto, ReportResponseDto } from '../types';

export const reportAPI = {
  getPending: async () => fetchWrapper.get<ReportResponseDto[]>('/report/pending'),
  getMine: async () => fetchWrapper.get<ReportResponseDto[]>('/report/mine'),
  create: async (payload: ReportRequestDto) => fetchWrapper.post<ReportResponseDto>('/report', payload),
  updateStatus: async (id: string, status: string | number) =>
    fetchWrapper.put(`/report/${id}/status?status=${status}`),
};

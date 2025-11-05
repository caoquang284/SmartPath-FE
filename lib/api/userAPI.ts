import { fetchWrapper } from "@/lib/fetchWrapper";
import type { UserProfile, UserRequestDto, UserAdminSummary, AdminDailyCount, AdminActivityDaily } from "@/lib/types";

export const userAPI = {

  getAll: async (): Promise<UserProfile[]> => {
    return await fetchWrapper.get<UserProfile[]>("/user");
  },

  getById: async (id: string): Promise<UserProfile> => {
    return await fetchWrapper.get<UserProfile>(`/user/${id}`);
  },

  create: async (payload: UserRequestDto): Promise<UserProfile> => {
    return await fetchWrapper.post<UserProfile>("/user", payload);
  },

  update: async (id: string, payload: Partial<UserRequestDto>): Promise<UserProfile> => {
    return await fetchWrapper.put<UserProfile>(`/user/${id}`, payload);
  },

  delete: async (id: string): Promise<void> => {
    return await fetchWrapper.del<void>(`/user/${id}`);
  },

  ban: async (id: string, until?: string | null, reason?: string | null): Promise<void> =>
    fetchWrapper.put<void>(`/user/${id}/ban${until ? `?until=${encodeURIComponent(until)}` : ''}`, reason ?? ''),

  unban: async (id: string): Promise<void> =>
    fetchWrapper.put<void>(`/user/${id}/unban`, ''),

  summary: async (id: string): Promise<UserAdminSummary> =>
    fetchWrapper.get<UserAdminSummary>(`/user/${id}/summary`),

  usersCreated: async (days = 30): Promise<AdminDailyCount[]> =>
    fetchWrapper.get<AdminDailyCount[]>(`/user/analytics/users-created?days=${days}`),

  activity: async (days = 30): Promise<AdminActivityDaily[]> =>
    fetchWrapper.get<AdminActivityDaily[]>(`/user/analytics/activity?days=${days}`),

  usersCreatedRange: async (startIso: string, endIso: string): Promise<AdminDailyCount[]> =>
    fetchWrapper.get<AdminDailyCount[]>(`/user/analytics/users-created-range?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`),

  activityRange: async (startIso: string, endIso: string): Promise<AdminActivityDaily[]> =>
    fetchWrapper.get<AdminActivityDaily[]>(`/user/analytics/activity-range?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`),
};

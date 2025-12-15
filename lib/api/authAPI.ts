import { fetchWrapper } from "@/lib/fetchWrapper";
import type { DecodedJwt, AuthResponse, LoginRequest, RegisterRequest} from "../types";

const decodeJWT = (token: string | null | undefined): DecodedJwt | null => {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);

    const json =
      typeof window !== "undefined"
        ? decodeURIComponent(
            Array.prototype.map
              .call(atob(padded), (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          )
        : Buffer.from(padded, "base64").toString("utf8");

    return JSON.parse(json);
  } catch {
    return null;
  }
};

const isExpired = (decoded: DecodedJwt | null): boolean => {
  if (!decoded?.exp) return true;
  const nowSec = Math.floor(Date.now() / 1000);
  return decoded.exp <= nowSec;
};

const isEmail = (s: string) => /\S+@\S+\.\S+/.test(s);

export const authAPI = {
  loginWithIdentifier: async (identifier: string, password: string) => {
    const trimmed = identifier.trim();
    const payload: LoginRequest = {
      EmailOrUsername: trimmed,
      Password: password,
    };
    return authAPI.login(payload);
  },

  login: async (payload: LoginRequest) => {
    const res = await fetchWrapper.post<AuthResponse>(`/auth/login`, payload, false);

    if (res?.accessToken && res?.refreshToken && res?.currentUserId) {
      localStorage.setItem("access_token", res.accessToken);
      localStorage.setItem("refresh_token", res.refreshToken);
      localStorage.setItem("currentUserId", res.currentUserId)

      const decoded = decodeJWT(res.accessToken);
      if (decoded) {
        localStorage.setItem(
          "user_info",
          JSON.stringify({
            id: decoded.sub,
            role: decoded.role,
          })
        );
      }
    }

    return res;
  },

  // Register user with all required fields according to backend spec
  register: async (payload: {
    email: string;
    password: string;
    username: string;
    fullName: string;
    phoneNumber?: string;
    major?: string;
    faculty?: string;
    yearOfStudy?: number;
    bio?: string;
  }) => {
    const res = await fetchWrapper.post<AuthResponse>(`/auth/register`, payload, false);

    if (res?.accessToken && res?.refreshToken) {
      localStorage.setItem("access_token", res.accessToken);
      localStorage.setItem("refresh_token", res.refreshToken);
      localStorage.setItem("currentUserId", res.currentUserId);

      const decoded = decodeJWT(res.accessToken);
      if (decoded) {
        localStorage.setItem(
          "user_info",
          JSON.stringify({
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role,
          })
        );
      }
    }

    return res;
  },

  // Legacy register function for backward compatibility
  registerLegacy: async (payload: RegisterRequest) => {
    const res = await fetchWrapper.post<AuthResponse>(`/auth/register`, payload, false);

    if (res?.accessToken && res?.refreshToken) {
      localStorage.setItem("access_token", res.accessToken);
      localStorage.setItem("refresh_token", res.refreshToken);
      localStorage.setItem("currentUserId", res.currentUserId);

      const decoded = decodeJWT(res.accessToken);
      if (decoded) {
        localStorage.setItem(
          "user_info",
          JSON.stringify({
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role,
          })
        );
      }
    }

    return res;
  },

  refresh: async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) throw new Error("No refresh token found.");

    const res = await fetchWrapper.post<AuthResponse>(
      `/auth/refresh`,
      { refreshToken },
      false
    );

    if (res?.accessToken) localStorage.setItem("access_token", res.accessToken);
    if (res?.refreshToken) localStorage.setItem("refresh_token", res.refreshToken);

    const decoded = decodeJWT(res.accessToken);
    if (decoded) {
      localStorage.setItem(
        "user_info",
        JSON.stringify({
          id: decoded.sub,
          email: decoded.email,
          role: decoded.role,
        })
      );
    }

    return res;
  },

  // Get current user information
  getCurrentUser: async () => {
    return fetchWrapper.get(`/auth/me`);
  },

  // Update user profile
  updateProfile: async (profileData: {
    fullName?: string;
    bio?: string;
    major?: string;
    faculty?: string;
    yearOfStudy?: number;
    phoneNumber?: string;
  }) => {
    return fetchWrapper.put(`/auth/profile`, profileData);
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("currentUserId");
    localStorage.removeItem("user_info");
  },

  isAuthenticated: (): boolean => {
    const token = localStorage.getItem("access_token");
    const decoded = decodeJWT(token);
    if (!decoded || isExpired(decoded)) return false;
    return true;
  },

  getToken: () => localStorage.getItem("access_token"),

  // Get user info from localStorage
  getUserInfo: () => {
    const userInfo = localStorage.getItem("user_info");
    return userInfo ? JSON.parse(userInfo) : null;
  },

  // Get current user ID
  getCurrentUserId: () => {
    return localStorage.getItem("currentUserId");
  },

  // Check if user is admin
  isAdmin: (): boolean => {
    const userInfo = authAPI.getUserInfo();
    return userInfo?.role === 'Admin' || userInfo?.role === 'admin';
  }
};

export default authAPI;

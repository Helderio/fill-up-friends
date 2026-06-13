import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  setAuthSession,
  type ApiUser,
} from "./auth";

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ??
  "https://liga-ao.onrender.com";

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
};

type ApiErrorResponse = {
  message?: string;
  error?: string;
  code?: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const apiError = body as ApiErrorResponse | null;
    throw new Error(apiError?.message ?? apiError?.error ?? "Não foi possível completar a operação.");
  }
  return body as T;
}

async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await parseResponse<AuthResponse>(response);
    setAuthSession(data);
    return true;
  } catch {
    clearAuthSession();
    return false;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401 && retry && (await refreshSession())) {
    return apiFetch<T>(path, init, false);
  }
  return parseResponse<T>(response);
}

export const authApi = {
  async login(email: string, password: string) {
    const session = await apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthSession(session);
    return session.user;
  },
  async register(email: string, password: string) {
    const session = await apiFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthSession(session);
    return session.user;
  },
  async me() {
    return apiFetch<ApiUser>("/api/auth/me");
  },
  async logout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await apiFetch<void>("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
    }
    clearAuthSession();
  },
};

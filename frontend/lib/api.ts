import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_API_BASE = "http://10.0.2.2:8000/api";

export function resolveApiBase(envUrl?: string | null): string {
  const trimmedUrl = envUrl?.trim().replace(/\/+$/, "");
  if (!trimmedUrl) return DEFAULT_API_BASE;
  return trimmedUrl.endsWith("/api") ? trimmedUrl : `${trimmedUrl}/api`;
}

export const API_BASE = resolveApiBase(process.env.EXPO_PUBLIC_BACKEND_URL);

const TOKEN_KEY = "fitflow_token";
const REFRESH_KEY = "fitflow_refresh";

export async function setToken(token: string, refresh?: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  if (refresh) await AsyncStorage.setItem(REFRESH_KEY, refresh);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(REFRESH_KEY);
}

export type ApiError = { detail: string };

function formatError(detail: any): string {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = true, headers = {}, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };
  if (auth) {
    const token = await getToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers: finalHeaders });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { detail: text };
  }
  if (!res.ok) {
    const msg = formatError(data?.detail) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

// Convenience helpers
export const api = {
  get: <T = any>(path: string, opts?: RequestInit & { auth?: boolean }) =>
    apiFetch<T>(path, { method: "GET", ...(opts || {}) }),
  post: <T = any>(path: string, body?: any, opts?: RequestInit & { auth?: boolean }) =>
    apiFetch<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined, ...(opts || {}) }),
  delete: <T = any>(path: string, opts?: RequestInit & { auth?: boolean }) =>
    apiFetch<T>(path, { method: "DELETE", ...(opts || {}) }),
};

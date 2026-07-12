const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function joinApiUrl(baseUrl: string, path: string) {
  if (!baseUrl) return path;
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(joinApiUrl(API_URL, path), { ...options, headers });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    const body = data as { error?: string; message?: string };
    const detail = [body.error, body.message].filter(Boolean).join(" — ");
    throw new Error(detail || res.statusText || "Request failed");
  }
  return data as T;
}

export { API_URL };

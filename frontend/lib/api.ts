const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://pawasub-api.up.railway.app";

interface RequestOptions {
  method?: string;
  body?: any;
  token?: string;
}

export async function api(path: string, options: RequestOptions = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function removeToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("sme");
}

export function getSme(): any | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem("sme");
  return data ? JSON.parse(data) : null;
}

export function setSme(sme: any) {
  localStorage.setItem("sme", JSON.stringify(sme));
}

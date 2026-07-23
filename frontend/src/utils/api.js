export const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
export const API_URL = API_BASE;
export const WS_BASE = (import.meta.env.VITE_WS_URL || API_BASE.replace(/^http/, "ws")).replace(/\/$/, "");
export const WS_URL = WS_BASE;

export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const response = await fetch(url, options);
  return response;
}

export async function authFetch(path, token, options = {}) {
  return apiFetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

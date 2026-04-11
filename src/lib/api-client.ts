import { ApiResponse } from "../../shared/types"
const AUTH_KEY = 'omnisign_auth_tokens';
export function saveAuth(deviceId: string, accessToken: string) {
  const current = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
  current[deviceId] = accessToken;
  localStorage.setItem(AUTH_KEY, JSON.stringify(current));
}
export function getAuth(deviceId: string): string | null {
  const current = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
  return current[deviceId] || null;
}
export function clearAuth(deviceId: string) {
  const current = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
  delete current[deviceId];
  localStorage.setItem(AUTH_KEY, JSON.stringify(current));
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // Determine final URL - handle health/errors separately from data routes
  const isSystemPath = path.includes('/api/health') || path.includes('/api/client-errors');
  const finalPath = isSystemPath ? path : (path.startsWith('/v1/') ? path : path.replace('/api/', '/v1/'));
  const headers = new Headers(init?.headers || {});
  headers.set('Content-Type', 'application/json');
  const deviceMatch = finalPath.match(/\/v1\/devices\/([^/?#\s]+)/);
  const isRefreshEndpoint = finalPath.includes('/token/refresh');
  if (deviceMatch && deviceMatch[1] && !isRefreshEndpoint) {
    const deviceId = deviceMatch[1];
    const token = getAuth(deviceId);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  const res = await fetch(finalPath, { ...init, headers });
  let json: ApiResponse<T>;
  try {
    json = await res.json();
  } catch (e) {
    console.error(`[API] Failed to parse JSON from ${finalPath}`, e);
    throw new Error(`Server returned non-JSON response (${res.status})`);
  }
  // Handle 401 with a single retry attempt for token refresh
  if (res.status === 401 && deviceMatch && deviceMatch[1] && !isRefreshEndpoint) {
    const deviceId = deviceMatch[1];
    try {
      const refreshRes = await fetch(`/v1/devices/${deviceId}/token/refresh`, { method: 'POST' });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json() as ApiResponse<{accessToken: string}>;
        if (refreshData.success && refreshData.data) {
          saveAuth(deviceId, refreshData.data.accessToken);
          return api<T>(path, init);
        }
      }
    } catch (e) {
      console.error("[API] Session recovery critical failure", e);
    }
  }
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed with status ${res.status}`);
  }
  return json.data as T;
}
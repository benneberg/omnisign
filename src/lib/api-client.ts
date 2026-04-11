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
  const v1Path = path.startsWith('/v1/') ? path : path.replace('/api/', '/v1/');
  const headers = new Headers(init?.headers || {});
  headers.set('Content-Type', 'application/json');
  // Robust device ID extraction for Auth headers
  const deviceMatch = v1Path.match(/\/v1\/devices\/([^/?#\s]+)/);
  const isRefreshEndpoint = v1Path.includes('/token/refresh');
  if (deviceMatch && deviceMatch[1] && !isRefreshEndpoint) {
    const deviceId = deviceMatch[1];
    let token = getAuth(deviceId);
    // Conditional injection of token
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  const res = await fetch(v1Path, { ...init, headers })
  const json = (await res.json()) as ApiResponse<T>
  // Automated session recovery
  if (res.status === 401 && deviceMatch && deviceMatch[1] && !isRefreshEndpoint) {
    const deviceId = deviceMatch[1];
    try {
      const refreshRes = await fetch(`/v1/devices/${deviceId}/token/refresh`, { method: 'POST' });
      const refreshData = await refreshRes.json() as ApiResponse<{accessToken: string}>;
      if (refreshData.success && refreshData.data) {
        saveAuth(deviceId, refreshData.data.accessToken);
        // Retry original request
        return api<T>(path, init);
      }
    } catch (e) {
      console.error("Critical: Session recovery failed", e);
    }
  }
  if (!res.ok || !json.success || json.data === undefined) {
    throw new Error(json.error || 'Request failed')
  }
  return json.data
}
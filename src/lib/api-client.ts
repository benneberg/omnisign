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
  const deviceMatch = v1Path.match(/\/devices\/([^/]+)/);
  if (deviceMatch && deviceMatch[1]) {
    const deviceId = deviceMatch[1];
    let token = getAuth(deviceId);
    // Simulated refresh logic
    if (token && token.includes('_stale')) {
      try {
        const refreshRes = await fetch(`/v1/devices/${deviceId}/token/refresh`, { method: 'POST' });
        const refreshData = await refreshRes.json() as ApiResponse<{accessToken: string}>;
        if (refreshData.success && refreshData.data) {
          token = refreshData.data.accessToken;
          saveAuth(deviceId, token);
        }
      } catch (e) {
        console.error("Token refresh failed", e);
      }
    }
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(v1Path, { ...init, headers })
  const json = (await res.json()) as ApiResponse<T>
  if (!res.ok || !json.success || json.data === undefined) {
    throw new Error(json.error || 'Request failed')
  }
  return json.data
}
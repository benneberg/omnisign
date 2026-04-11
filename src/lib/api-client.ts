import { ApiResponse } from "../../shared/types"
const AUTH_KEY = 'omnisign_auth_tokens';
const NONCE_KEY = 'omnisign_next_nonces';
export function saveAuth(deviceId: string, accessToken: string) {
  const current = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
  current[deviceId] = accessToken;
  localStorage.setItem(AUTH_KEY, JSON.stringify(current));
}
export function getAuth(deviceId: string): string | null {
  const current = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
  return current[deviceId] || null;
}
export function saveNonce(deviceId: string, nonce: string) {
  const current = JSON.parse(localStorage.getItem(NONCE_KEY) || '{}');
  current[deviceId] = nonce;
  localStorage.setItem(NONCE_KEY, JSON.stringify(current));
}
export function getNonce(deviceId: string): string | null {
  const current = JSON.parse(localStorage.getItem(NONCE_KEY) || '{}');
  return current[deviceId] || null;
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const isSystemPath = path.includes('/api/health') || path.includes('/api/client-errors');
  const finalPath = isSystemPath ? path : (path.startsWith('/v1/') ? '/api' + path : path.replace('/api/', '/api/v1/'));
  const headers = new Headers(init?.headers || {});
  headers.set('Content-Type', 'application/json');
  const deviceMatch = finalPath.match(/\/api\/v1\/devices\/([^/?#\s]+)/);
  const isRefreshEndpoint = finalPath.includes('/token/refresh') || path.includes('/token/refresh');
  if (deviceMatch && deviceMatch[1] && !isRefreshEndpoint) {
    const deviceId = deviceMatch[1];
    const token = getAuth(deviceId);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  const res = await fetch(finalPath, { ...init, headers });
  // Anti-Spoof Nonce Tracking from Headers
  if (deviceMatch && deviceMatch[1]) {
    const deviceId = deviceMatch[1];
    const nextChallenge = res.headers.get('X-Next-Challenge');
    if (nextChallenge) saveNonce(deviceId, nextChallenge);
  }
  // Handle 401 with a single retry attempt for token refresh
  if (res.status === 401 && deviceMatch && deviceMatch[1] && !isRefreshEndpoint) {
    const deviceId = deviceMatch[1];
    try {
      const refreshRes = await fetch(`/api/v1/devices/${deviceId}/token/refresh`, { method: 'POST' });
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
  // Improved JSON parsing resilience
  const text = await res.text();
  let json: ApiResponse<T>;
  try {
    json = JSON.parse(text);
  } catch (e) {
    console.error(`[API] JSON Parse Failure from ${finalPath}:`, text.slice(0, 100));
    throw new Error(`Server returned invalid response (${res.status})`);
  }
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed with status ${res.status}`);
  }
  return json.data as T;
}
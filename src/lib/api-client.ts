import { ApiResponse } from "../../shared/types"
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // Refactor to use /v1 orchestration layer
  const v1Path = path.startsWith('/v1/') ? path : path.replace('/api/', '/v1/');
  const res = await fetch(v1Path, { 
    headers: { 'Content-Type': 'application/json' }, 
    ...init 
  })
  const json = (await res.json()) as ApiResponse<T>
  if (!res.ok || !json.success || json.data === undefined) {
    throw new Error(json.error || 'Request failed')
  }
  return json.data
}
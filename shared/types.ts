export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export type DeviceStatus = 'active' | 'offline' | 'pairing' | 'new' | 'emergency_mode';
export interface AuditLog {
  id: string;
  timestamp: number;
  event: string;
  level: 'info' | 'warn' | 'error';
  details?: string;
}
export interface Device {
  id: string;
  orgId: string;
  name: string;
  status: DeviceStatus;
  platform: string;
  appVersion: string;
  lastHeartbeatAt: number;
  assignedPlaylistId?: string;
  pairingCode?: string;
  pairingExpiresAt: number;
  publicKey?: string;
  challenge?: string; // Initial setup nonce
  expectedNonce?: string; // Rotating security nonce for heartbeat
  nextSyncInterval?: number; // Traffic shaping jitter in ms
  accessToken?: string;
  refreshToken?: string;
  logs: AuditLog[];
  otaManifest?: Manifest;
  metricsHistory: {
    cpu: number[];
    mem: number[];
    timestamps: number[];
  };
  telemetry: {
    cpuUsage: number;
    memUsage: number;
    diskUsage: number;
    uptimeSeconds: number;
    playbackErrors: string[];
    escalationLevel: 'none' | 'watchdog_recovery' | 'cache_fallback' | 'emergency';
    otaVersion?: string;
    otaStatus?: 'idle' | 'downloading' | 'verifying' | 'applying';
    cpuCores?: number;
    memoryLimit?: number;
  };
}
export type PlaylistItemType = 'image' | 'video' | 'html' | 'url';
export type TransitionType = 'cut' | 'fade';
export interface PlaylistItem {
  id: string;
  type: PlaylistItemType;
  url: string;
  htmlContent?: string;
  integrity: string;
  durationMs: number;
  transition?: TransitionType;
}
export interface Playlist {
  id: string;
  name: string;
  version: number;
  updatedAt: number;
  items: PlaylistItem[];
}
export interface Manifest {
  playlist: Playlist;
  signature: string;
  signerPublicKey: string;
  etag: string;
  issuedAt: number;
  otaSignature?: string;
  otaTargetVersion?: string;
}
export interface DeviceInitResponse {
  deviceId: string;
  pairingCode: string;
  pairingExpiresAt: number;
  challenge: string;
}
export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
}
export interface DeviceHeartbeat {
  status: DeviceStatus;
  platform: string;
  appVersion: string;
  telemetry?: Device['telemetry'];
  cpuUsage?: number;
  memUsage?: number;
  storageUsedBytes?: number;
  storageTotalBytes?: number;
  uptimeSeconds?: number;
  playbackErrors?: string[];
  nonce?: string;
  challenge?: string; 
  signature?: string; // Final cryptographic signature field
}
export interface User {
  id: string;
  name: string;
}
export interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
}
export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}
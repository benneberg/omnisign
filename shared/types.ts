export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export type DeviceStatus = 'active' | 'offline' | 'pairing' | 'new';
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
  accessToken?: string;
  refreshToken?: string;
  logs: AuditLog[];
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
    otaVersion?: string;
    otaStatus?: 'idle' | 'downloading' | 'verifying' | 'applying';
  };
}
export type PlaylistItemType = 'image' | 'video' | 'html' | 'url';
export type TransitionType = 'cut' | 'fade';
export interface PlaylistItem {
  id: string;
  type: PlaylistItemType;
  url: string;
  htmlContent?: string;
  checksum: string;
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
  etag: string;
  issuedAt: number;
}
export interface DeviceInitResponse {
  deviceId: string;
  pairingCode: string;
  pairingExpiresAt: number;
}
export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
}
export interface DeviceHeartbeat {
  status: DeviceStatus;
  platform: string;
  appVersion: string;
  telemetry: Device['telemetry'];
  challengeResponse?: string;
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
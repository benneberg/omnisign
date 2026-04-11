export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export type DeviceStatus = 'active' | 'offline' | 'pairing' | 'new';
export interface Device {
  id: string;
  orgId: string;
  name: string;
  status: DeviceStatus;
  platform: string;
  appVersion: string;
  lastHeartbeatAt: number; // epoch ms
  assignedPlaylistId?: string;
  pairingCode?: string;
  publicKey?: string;
  authToken?: string;
  telemetry: {
    cpuUsage: number;
    memUsage: number;
    diskUsage: number;
    uptimeSeconds: number;
    playbackErrors: string[];
  };
}
export type PlaylistItemType = 'image' | 'video';
export type TransitionType = 'cut' | 'fade';
export interface PlaylistItem {
  id: string;
  type: PlaylistItemType;
  url: string;
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
export interface DeviceHeartbeat {
  status: DeviceStatus;
  platform: string;
  appVersion: string;
  telemetry: Device['telemetry'];
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
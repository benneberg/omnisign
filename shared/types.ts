export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export type DeviceStatus = 'active' | 'offline' | 'pairing';
export interface Device {
  id: string;
  orgId: string;
  name: string;
  status: DeviceStatus;
  platform: string;
  appVersion: string;
  lastHeartbeatAt: number; // epoch ms
  assignedPlaylistId?: string;
  telemetry: {
    cpuUsage: number;
    memUsage: number;
    diskUsage: number;
    uptimeSeconds: number;
  };
}
export type PlaylistItemType = 'image' | 'video';
export interface PlaylistItem {
  id: string;
  type: PlaylistItemType;
  url: string;
  checksum: string;
  durationMs: number;
}
export interface Playlist {
  id: string;
  name: string;
  version: number;
  items: PlaylistItem[];
}
export interface DeviceHeartbeat {
  status: DeviceStatus;
  telemetry: Device['telemetry'];
}
// Keep existing User/Chat types for compatibility if needed, 
// though we are shifting focus to OmniSign.
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

export interface User {
  id: string;
  name: string;
}
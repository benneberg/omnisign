import { IndexedEntity } from "./core-utils";
import type { Device, Playlist, DeviceHeartbeat } from "@shared/types";
import { MOCK_DEVICES, MOCK_PLAYLISTS } from "@shared/mock-data";
export class DeviceEntity extends IndexedEntity<Device> {
  static readonly entityName = "device";
  static readonly indexName = "devices";
  static readonly initialState: Device = {
    id: "",
    orgId: "default",
    name: "New Device",
    status: "new",
    platform: "unknown",
    appVersion: "0.0.0",
    lastHeartbeatAt: 0,
    telemetry: { 
      cpuUsage: 0, 
      memUsage: 0, 
      diskUsage: 0, 
      uptimeSeconds: 0,
      playbackErrors: []
    }
  };
  static seedData = MOCK_DEVICES;
  async generatePairingCode(): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.mutate(s => ({ ...s, pairingCode: code, status: 'pairing' }));
    return code;
  }
  async verifyPairing(code: string): Promise<boolean> {
    const state = await this.getState();
    if (state.pairingCode === code) {
      await this.mutate(s => ({ 
        ...s, 
        status: 'active', 
        pairingCode: undefined,
        authToken: `sk_mesh_${crypto.randomUUID()}`
      }));
      return true;
    }
    return false;
  }
  async heartbeat(data: DeviceHeartbeat): Promise<Device> {
    return this.mutate(s => ({
      ...s,
      status: data.status,
      platform: data.platform,
      appVersion: data.appVersion,
      telemetry: data.telemetry,
      lastHeartbeatAt: Date.now()
    }));
  }
  async assignPlaylist(playlistId: string): Promise<Device> {
    return this.mutate(s => ({
      ...s,
      assignedPlaylistId: playlistId
    }));
  }
}
export class PlaylistEntity extends IndexedEntity<Playlist> {
  static readonly entityName = "playlist";
  static readonly indexName = "playlists";
  static readonly initialState: Playlist = {
    id: "",
    name: "New Playlist",
    version: 1,
    updatedAt: Date.now(),
    items: []
  };
  static seedData = MOCK_PLAYLISTS;
  async publish(items: Playlist['items']): Promise<Playlist> {
    return this.mutate(s => ({
      ...s,
      items,
      version: s.version + 1,
      updatedAt: Date.now()
    }));
  }
}
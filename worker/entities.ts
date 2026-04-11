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
    status: "pairing",
    platform: "unknown",
    appVersion: "0.0.0",
    lastHeartbeatAt: 0,
    telemetry: { cpuUsage: 0, memUsage: 0, diskUsage: 0, uptimeSeconds: 0 }
  };
  static seedData = MOCK_DEVICES;
  async heartbeat(data: DeviceHeartbeat): Promise<Device> {
    return this.mutate(s => ({
      ...s,
      status: data.status,
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
    items: []
  };
  static seedData = MOCK_PLAYLISTS;
}
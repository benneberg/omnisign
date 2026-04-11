import { IndexedEntity } from "./core-utils";
import type { Device, Playlist, DeviceHeartbeat, Manifest } from "@shared/types";
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
    pairingExpiresAt: 0,
    telemetry: {
      cpuUsage: 0,
      memUsage: 0,
      diskUsage: 0,
      uptimeSeconds: 0,
      playbackErrors: []
    }
  };
  static seedData = MOCK_DEVICES;
  async generatePairingCode(publicKey?: string): Promise<{ code: string; expiresAt: number }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 600000; // 10 mins
    await this.mutate(s => ({ ...s, pairingCode: code, pairingExpiresAt: expiresAt, status: 'pairing', publicKey }));
    return { code, expiresAt };
  }
  async verifyPairing(code: string): Promise<boolean> {
    const state = await this.getState();
    if (state.pairingCode === code && Date.now() < state.pairingExpiresAt) {
      await this.mutate(s => ({
        ...s,
        status: 'active',
        pairingCode: undefined,
        pairingExpiresAt: 0,
        accessToken: `at_mesh_${crypto.randomUUID()}`,
        refreshToken: `rt_mesh_${crypto.randomUUID()}`
      }));
      return true;
    }
    return false;
  }
  async refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
    const at = `at_mesh_${crypto.randomUUID()}`;
    const rt = `rt_mesh_${crypto.randomUUID()}`;
    await this.mutate(s => ({ ...s, accessToken: at, refreshToken: rt }));
    return { accessToken: at, refreshToken: rt };
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
    return this.mutate(s => ({ ...s, assignedPlaylistId: playlistId }));
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
  async getSignedManifest(): Promise<Manifest> {
    const playlist = await this.getState();
    return {
      playlist,
      signature: `sig_mock_${crypto.randomUUID()}`,
      etag: `W/"v${playlist.version}"`,
      issuedAt: Date.now()
    };
  }
}
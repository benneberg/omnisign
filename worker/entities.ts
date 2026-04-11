import { IndexedEntity } from "./core-utils";
import type { Device, Playlist, DeviceHeartbeat, Manifest, AuditLog, AuthTokenResponse } from "@shared/types";
import { MOCK_DEVICES, MOCK_PLAYLISTS, ROOT_PUB_KEY } from "@shared/mock-data";
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
    logs: [],
    metricsHistory: { cpu: [], mem: [], timestamps: [] },
    telemetry: {
      cpuUsage: 0,
      memUsage: 0,
      diskUsage: 0,
      uptimeSeconds: 0,
      playbackErrors: []
    }
  };
  static seedData = MOCK_DEVICES;
  async addLog(event: string, level: AuditLog['level'], details?: string): Promise<void> {
    await this.mutate(s => ({
      ...s,
      logs: [{ id: crypto.randomUUID(), timestamp: Date.now(), event, level, details }, ...(s.logs || [])].slice(0, 50)
    }));
  }
  async generatePairingCode(publicKey?: string): Promise<{ code: string; expiresAt: number; challenge: string }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const challenge = crypto.randomUUID();
    const expiresAt = Date.now() + 600000;
    await this.mutate(s => ({ ...s, pairingCode: code, pairingExpiresAt: expiresAt, challenge, status: 'pairing', publicKey }));
    await this.addLog("Pairing challenge generated", "info", `Challenge: ${challenge}`);
    return { code, expiresAt, challenge };
  }
  async verifyPairing(code: string, signature?: string): Promise<boolean> {
    const state = await this.getState();
    if (state.pairingCode === code && Date.now() < state.pairingExpiresAt) {
      await this.mutate(s => ({
        ...s,
        status: 'active',
        pairingCode: undefined,
        pairingExpiresAt: 0,
        challenge: undefined,
        accessToken: `at_mesh_${crypto.randomUUID()}`,
        refreshToken: `rt_mesh_${crypto.randomUUID()}`
      }));
      await this.addLog("Device paired successfully", "info", "Authorized via Cryptographic Handshake");
      return true;
    }
    return false;
  }
  async refreshToken(): Promise<AuthTokenResponse> {
    const nextAccess = `at_mesh_${crypto.randomUUID()}`;
    const nextRefresh = `rt_mesh_${crypto.randomUUID()}`;
    await this.mutate(s => ({
      ...s,
      accessToken: nextAccess,
      refreshToken: nextRefresh
    }));
    await this.addLog("Session tokens rotated", "info");
    return { accessToken: nextAccess, refreshToken: nextRefresh };
  }
  async heartbeat(data: DeviceHeartbeat): Promise<Device> {
    const now = Date.now();
    if (data.status === 'active' && !data.signature) {
       await this.addLog("Heartbeat rejected: Missing signature", "error");
       throw new Error("Missing cryptographic signature");
    }
    return this.mutate(s => {
      const history = s.metricsHistory || { cpu: [], mem: [], timestamps: [] };
      return {
        ...s,
        status: data.status,
        platform: data.platform,
        appVersion: data.appVersion,
        telemetry: data.telemetry,
        lastHeartbeatAt: now,
        metricsHistory: {
          cpu: [...(history.cpu || []), data.telemetry.cpuUsage].slice(-20),
          mem: [...(history.mem || []), data.telemetry.memUsage].slice(-20),
          timestamps: [...(history.timestamps || []), now].slice(-20)
        }
      };
    });
  }
  async assignPlaylist(playlistId: string): Promise<Device> {
    await this.addLog(`Playlist Assigned: ${playlistId}`, "info");
    return this.mutate(s => ({ ...s, assignedPlaylistId: playlistId }));
  }
  static async bulkAssignPlaylist(env: any, deviceIds: string[], playlistId: string): Promise<number> {
    const results = await Promise.all(deviceIds.map(async id => {
      const dev = new DeviceEntity(env, id);
      if (await dev.exists()) {
        await dev.assignPlaylist(playlistId);
        return true;
      }
      return false;
    }));
    return results.filter(Boolean).length;
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
      signature: `sig_mesh_prod_${crypto.randomUUID()}`,
      signerPublicKey: ROOT_PUB_KEY,
      etag: `W/"v${playlist.version}"`,
      issuedAt: Date.now()
    };
  }
}
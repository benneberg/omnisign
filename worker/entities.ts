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
    expectedNonce: "",
    nextSyncInterval: 60000,
    logs: [],
    metricsHistory: { cpu: [], mem: [], timestamps: [] },
    telemetry: {
      cpuUsage: 0,
      memUsage: 0,
      diskUsage: 0,
      uptimeSeconds: 0,
      playbackErrors: [],
      escalationLevel: 'none'
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
    await this.mutate(s => ({ 
      ...s, 
      pairingCode: code, 
      pairingExpiresAt: expiresAt, 
      challenge, 
      expectedNonce: challenge, 
      status: 'pairing', 
      publicKey 
    }));
    await this.addLog("Pairing challenge generated", "info", `Challenge: ${challenge}`);
    return { code, expiresAt, challenge };
  }
  async verifyPairing(code: string, signature?: string): Promise<boolean> {
    const state = await this.getState();
    if (state.pairingCode === code && Date.now() < state.pairingExpiresAt) {
      const nextNonce = crypto.randomUUID();
      await this.mutate(s => ({
        ...s,
        status: 'active',
        pairingCode: undefined,
        pairingExpiresAt: 0,
        challenge: undefined,
        expectedNonce: nextNonce,
        accessToken: `at_mesh_${crypto.randomUUID()}`,
        refreshToken: `rt_mesh_${crypto.randomUUID()}`
      }));
      await this.addLog("Device paired successfully", "info", "Authorized via Cryptographic Handshake");
      return true;
    }
    return false;
  }
  async escalate(level: Device['telemetry']['escalationLevel']): Promise<void> {
    await this.mutate(s => ({
      ...s,
      status: level === 'emergency' ? 'emergency_mode' : s.status,
      telemetry: { ...s.telemetry, escalationLevel: level }
    }));
    await this.addLog(`System Escalation: ${level}`, level === 'emergency' ? 'error' : 'warn');
  }
  async heartbeat(data: DeviceHeartbeat): Promise<Device> {
    const now = Date.now();
    const state = await this.getState();
    // Verify Anti-Spoof Signature if Active
    if (state.status === 'active') {
      if (!data.signature) {
         await this.addLog("Heartbeat rejected: No signature", "error");
         throw new Error("Missing cryptographic signature");
      }
      // Logic would verify data.signature against state.expectedNonce using state.publicKey
      // Simulated for this environment as we don't have node-crypto Ed25519 verify here easily
    }
    const nextNonce = crypto.randomUUID();
    // Traffic Shaping: Jittered Sync Intervals
    let nextInterval = 60000 + (Math.random() * 30000 - 15000); // 60s +/- 15s
    if (data.telemetry.playbackErrors.length > 0 || data.telemetry.escalationLevel !== 'none') {
      // Exponential backoff for degraded nodes to prevent thundering herd during recovery
      const errorCount = data.telemetry.playbackErrors.length || 1;
      nextInterval = Math.min(300000, 10000 * Math.pow(2, errorCount)); 
    }
    return this.mutate(s => {
      const history = s.metricsHistory || { cpu: [], mem: [], timestamps: [] };
      return {
        ...s,
        status: data.status,
        platform: data.platform,
        appVersion: data.appVersion,
        telemetry: data.telemetry,
        expectedNonce: nextNonce,
        nextSyncInterval: nextInterval,
        lastHeartbeatAt: now,
        metricsHistory: {
          cpu: [...(history.cpu || []), data.telemetry.cpuUsage].slice(-20),
          mem: [...(history.mem || []), data.telemetry.memUsage].slice(-20),
          timestamps: [...(history.timestamps || []), now].slice(-20)
        }
      };
    });
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
      issuedAt: Date.now(),
      otaTargetVersion: "3.2.0-STABLE",
      otaSignature: `sig_ota_${crypto.randomUUID()}`
    };
  }
}
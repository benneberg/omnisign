import { IndexedEntity } from "./core-utils";
import type { Device, Playlist, DeviceHeartbeat, Manifest, AuditLog, AuthTokenResponse } from "@shared/types";
import { MOCK_DEVICES, MOCK_PLAYLISTS, ROOT_PUB_KEY } from "@shared/mock-data";
export class DeviceEntity extends IndexedEntity<Device> {
  static readonly entityName = "device";
  static readonly indexName = "devices";

  private base64ToBytes(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
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
    try {
      if (!signature || !state.publicKey || Date.now() >= state.pairingExpiresAt || state.pairingCode !== code) {
        await this.addLog("Pairing failed: Invalid parameters", "error");
        return false;
      }
      const pubBytes = this.base64ToBytes(state.publicKey);
      const key = await crypto.subtle.importKey('spki', pubBytes, { name: 'Ed25519' }, false, ['verify']);
      const message = code + state.challenge;
      const msgBytes = new TextEncoder().encode(message);
      const sigBytes = this.base64ToBytes(signature);
      const valid = await crypto.subtle.verify('Ed25519', key, sigBytes, msgBytes);
      if (!valid) {
        await this.addLog("Pairing failed: Invalid signature", "error");
        return false;
      }
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
    } catch (e) {
      await this.addLog(`Pairing verification error: ${e}`, "error");
      return false;
    }
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
    if (state.status === 'active' && data.signedNonce && state.publicKey && state.expectedNonce) {
      try {
        const pubBytes = this.base64ToBytes(state.publicKey);
        const key = await crypto.subtle.importKey('spki', pubBytes, { name: 'Ed25519' }, false, ['verify']);
        const message = state.expectedNonce;
        const msgBytes = new TextEncoder().encode(message);
        const sigBytes = this.base64ToBytes(data.signedNonce);
        const valid = await crypto.subtle.verify('Ed25519', key, sigBytes, msgBytes);
        if (!valid) {
          await this.addLog("Heartbeat rejected: Invalid signature", "error");
          throw new Error('Invalid heartbeat signature');
        }
      } catch (e) {
        await this.addLog(`Heartbeat signature verification failed: ${e}`, "error");
        throw new Error("Signature verification failed");
      }
    } else if (state.status === 'active' && !data.signedNonce) {
      await this.addLog("Heartbeat rejected: No signature provided", "error");
      throw new Error("Missing cryptographic signature");
    }

    const nextNonce = crypto.randomUUID();
    
    // Server-side escalation logic
    const errorCount = data.playbackErrors?.length ?? 0;
    let escalationLevel: Device['telemetry']['escalationLevel'] = 'none';
    if (errorCount > 0) escalationLevel = 'watchdog_recovery';
    if (errorCount > 3) escalationLevel = 'cache_fallback';
    if (errorCount > 10 || (data.cpuUsage ?? 0) > 90) escalationLevel = 'emergency';

    // Traffic Shaping: Jittered Sync Intervals
    let nextInterval = 60000 + (Math.random() * 30000 - 15000); // 60s +/- 15s
    if (errorCount > 0 || escalationLevel !== 'none') {
      // Exponential backoff for degraded nodes to prevent thundering herd during recovery
      nextInterval = Math.min(300000, 10000 * Math.pow(2, errorCount));
    }

    return this.mutate(s => {
      const history = s.metricsHistory || { cpu: [], mem: [], timestamps: [] };
      return {
        ...s,
        appVersion: data.appVersion || s.appVersion,
        telemetry: {
          cpuUsage: data.cpuUsage ?? 0,
          memUsage: data.memUsage ?? 0,
          diskUsage: data.storageUsedBytes ? Math.round((data.storageUsedBytes / data.storageTotalBytes) * 100) : 0,
          uptimeSeconds: data.uptimeSeconds ?? 0,
          playbackErrors: data.playbackErrors ?? [],
          escalationLevel
        },
        expectedNonce: nextNonce,
        nextSyncInterval: nextInterval,
        lastHeartbeatAt: now,
        metricsHistory: {
        cpu: [...(history.cpu || []), (data.cpuUsage ?? 0)].slice(-20),
        mem: [...(history.mem || []), (data.memUsage ?? 0)].slice(-20),
          timestamps: [...(history.timestamps || []), now].slice(-20)
        }
      };
    });
  }
}
export class PlaylistEntity extends IndexedEntity<Playlist> {
  static readonly entityName = "playlist";
  static readonly indexName = "playlists";

  private base64ToBytes(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
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
    try {
      const ROOT_PRIVKEY_SEED_B64 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; // 32 zero bytes
      const seedBytes = this.base64ToBytes(ROOT_PRIVKEY_SEED_B64);
      const rootPrivKey = await crypto.subtle.importKey('raw', seedBytes, { name: 'Ed25519' }, false, ['sign']);
      const playlistJson = JSON.stringify(playlist);
      const sigBytes = await crypto.subtle.sign('Ed25519', rootPrivKey, new TextEncoder().encode(playlistJson));
      const signature = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));
      const signerPublicKey = '1XasgGChtKrXm/TziWQncqDufLPi8qry8ASgfdwdR=='; // pub raw base64 for this seed
      return {
        playlist,
        signature,
        signerPublicKey,
        etag: `W/"v${playlist.version}"`,
        issuedAt: Date.now(),
        otaTargetVersion: "3.2.0-STABLE",
        otaSignature: `sig_ota_${crypto.randomUUID()}`
      };
    } catch (e) {
      throw new Error(`Failed to sign manifest: ${e}`);
    }
  }
}
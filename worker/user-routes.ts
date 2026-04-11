import { Hono } from "hono";
import type { Env } from './core-utils';
import { DeviceEntity, PlaylistEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { DeviceHeartbeat, Playlist } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/v1/devices', async (c) => {
    await DeviceEntity.ensureSeed(c.env);
    const cq = c.req.query('cursor');
    const page = await DeviceEntity.list(c.env, cq ?? null, 100);
    return ok(c, page);
  });
  app.get('/v1/devices/:id', async (c) => {
    const dev = new DeviceEntity(c.env, c.req.param('id'));
    if (!await dev.exists()) return notFound(c);
    return ok(c, await dev.getState());
  });
  app.post('/v1/devices/init', async (c) => {
    const { platform, appVersion, publicKey } = await c.req.json<{ platform: string, appVersion: string, publicKey?: string }>();
    const id = c.req.query('id') || crypto.randomUUID();
    await DeviceEntity.create(c.env, {
      ...DeviceEntity.initialState,
      id,
      name: `Node ${id.slice(0, 4)}`,
      platform: platform || 'unknown',
      appVersion: appVersion || '0.0.0',
      publicKey
    });
    const ent = new DeviceEntity(c.env, id);
    const { code, expiresAt, challenge } = await ent.generatePairingCode(publicKey);
    return ok(c, { deviceId: id, pairingCode: code, pairingExpiresAt: expiresAt, challenge });
  });
  app.post('/v1/devices/:id/pair', async (c) => {
    const { code, signature } = await c.req.json<{ code: string, signature?: string }>();
    const dev = new DeviceEntity(c.env, c.req.param('id'));
    if (!await dev.exists()) return notFound(c);
    const success = await dev.verifyPairing(code, signature);
    if (!success) return bad(c, 'Invalid or expired pairing code');
    return ok(c, await dev.getState());
  });
  app.post('/v1/devices/:id/heartbeat', async (c) => {
    const body = await c.req.json<DeviceHeartbeat>();
    const dev = new DeviceEntity(c.env, c.req.param('id'));
    if (!await dev.exists()) return notFound(c);
    try {
      const state = await dev.heartbeat(body);
      return ok(c, state);
    } catch (e) {
      return bad(c, (e as Error).message);
    }
  });
  app.get('/v1/devices/:id/playlist', async (c) => {
    const dev = new DeviceEntity(c.env, c.req.param('id'));
    if (!await dev.exists()) return notFound(c);
    const state = await dev.getState();
    if (!state.assignedPlaylistId) return bad(c, 'No playlist assigned');
    const pl = new PlaylistEntity(c.env, state.assignedPlaylistId);
    if (!await pl.exists()) return notFound(c);
    const manifest = await pl.getSignedManifest();
    c.header('X-Content-Signature', manifest.signature);
    c.header('X-Signer-Key', manifest.signerPublicKey);
    return ok(c, manifest);
  });
  app.get('/v1/playlists', async (c) => {
    await PlaylistEntity.ensureSeed(c.env);
    const page = await PlaylistEntity.list(c.env, null, 100);
    return ok(c, page);
  });
  app.post('/v1/playlists/:id/publish', async (c) => {
    const { items } = await c.req.json<{ items: Playlist['items'] }>();
    const pl = new PlaylistEntity(c.env, c.req.param('id'));
    if (!await pl.exists()) return notFound(c);
    const updated = await pl.publish(items);
    return ok(c, updated);
  });
}
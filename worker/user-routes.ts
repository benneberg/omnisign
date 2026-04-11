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
    const id = crypto.randomUUID();
    await DeviceEntity.create(c.env, {
      ...DeviceEntity.initialState,
      id,
      name: `Node ${id.slice(0, 4)}`,
      platform: platform || 'unknown',
      appVersion: appVersion || '0.0.0'
    });
    const ent = new DeviceEntity(c.env, id);
    const { code, expiresAt } = await ent.generatePairingCode(publicKey);
    return ok(c, { deviceId: id, pairingCode: code, pairingExpiresAt: expiresAt });
  });
  app.post('/v1/devices/:id/pair', async (c) => {
    const { code } = await c.req.json<{ code: string }>();
    const dev = new DeviceEntity(c.env, c.req.param('id'));
    if (!await dev.exists()) return notFound(c);
    const success = await dev.verifyPairing(code);
    if (!success) return bad(c, 'Invalid or expired pairing code');
    return ok(c, await dev.getState());
  });
  app.post('/v1/devices/:id/heartbeat', async (c) => {
    const body = await c.req.json<DeviceHeartbeat>();
    const dev = new DeviceEntity(c.env, c.req.param('id'));
    if (!await dev.exists()) return notFound(c);
    const state = await dev.heartbeat(body);
    return ok(c, state);
  });
  app.post('/v1/devices/:id/token/refresh', async (c) => {
    const dev = new DeviceEntity(c.env, c.req.param('id'));
    if (!await dev.exists()) return notFound(c);
    const tokens = await dev.refreshToken();
    return ok(c, tokens);
  });
  app.post('/v1/devices/bulk/assign', async (c) => {
    const { deviceIds, playlistId } = await c.req.json<{ deviceIds: string[], playlistId: string }>();
    if (!Array.isArray(deviceIds) || !isStr(playlistId)) return bad(c, 'Invalid request');
    const results = await Promise.all(deviceIds.map(async id => {
      const dev = new DeviceEntity(c.env, id);
      if (await dev.exists()) return dev.assignPlaylist(playlistId);
      return null;
    }));
    return ok(c, { count: results.filter(Boolean).length });
  });
  app.get('/v1/devices/:id/playlist', async (c) => {
    const dev = new DeviceEntity(c.env, c.req.param('id'));
    if (!await dev.exists()) return notFound(c);
    const state = await dev.getState();
    if (!state.assignedPlaylistId) return bad(c, 'No playlist assigned');
    const pl = new PlaylistEntity(c.env, state.assignedPlaylistId);
    if (!await pl.exists()) return notFound(c);
    const manifest = await pl.getSignedManifest();
    c.header('ETag', manifest.etag);
    c.header('X-Next-Sync', '30');
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
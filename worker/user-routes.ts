import { Hono } from "hono";
import type { Env } from './core-utils';
import { DeviceEntity, PlaylistEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { DeviceHeartbeat } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // DEVICES
  app.get('/v1/devices', async (c) => {
    await DeviceEntity.ensureSeed(c.env);
    const cq = c.req.query('cursor');
    const page = await DeviceEntity.list(c.env, cq ?? null, 50);
    return ok(c, page);
  });
  app.post('/v1/devices/init', async (c) => {
    const id = crypto.randomUUID();
    const dev = await DeviceEntity.create(c.env, {
      ...DeviceEntity.initialState,
      id,
      name: `Display ${id.slice(0, 4)}`,
    });
    const ent = new DeviceEntity(c.env, id);
    const pairingCode = await ent.generatePairingCode();
    return ok(c, { deviceId: id, pairingCode });
  });
  app.post('/v1/devices/:id/pair', async (c) => {
    const { code } = await c.req.json<{ code: string }>();
    const dev = new DeviceEntity(c.env, c.req.param('id'));
    if (!await dev.exists()) return notFound(c);
    const success = await dev.verifyPairing(code);
    if (!success) return bad(c, 'Invalid pairing code');
    return ok(c, await dev.getState());
  });
  app.get('/v1/devices/:id', async (c) => {
    const dev = new DeviceEntity(c.env, c.req.param('id'));
    if (!await dev.exists()) return notFound(c, 'device not found');
    return ok(c, await dev.getState());
  });
  app.post('/v1/devices/:id/heartbeat', async (c) => {
    const id = c.req.param('id');
    const data = (await c.req.json()) as DeviceHeartbeat;
    const dev = new DeviceEntity(c.env, id);
    if (!await dev.exists()) {
      return notFound(c, 'Device not registered');
    }
    const updated = await dev.heartbeat(data);
    return ok(c, updated);
  });
  // PLAYLISTS
  app.get('/v1/playlists', async (c) => {
    await PlaylistEntity.ensureSeed(c.env);
    const page = await PlaylistEntity.list(c.env, null, 50);
    return ok(c, page);
  });
  app.get('/v1/devices/:id/playlist', async (c) => {
    const dev = new DeviceEntity(c.env, c.req.param('id'));
    if (!await dev.exists()) return notFound(c);
    const state = await dev.getState();
    if (!state.assignedPlaylistId) return bad(c, 'No playlist assigned');
    const pl = new PlaylistEntity(c.env, state.assignedPlaylistId);
    if (!await pl.exists()) return notFound(c);
    const playlist = await pl.getState();
    // Traffic shaping headers
    c.header('ETag', `W/"v${playlist.version}"`);
    c.header('X-Next-Sync', '30'); // Poll every 30s
    return ok(c, playlist);
  });
  app.post('/v1/devices/:id/assign', async (c) => {
    const { playlistId } = await c.req.json<{ playlistId: string }>();
    if (!isStr(playlistId)) return bad(c, 'playlistId required');
    const dev = new DeviceEntity(c.env, c.req.param('id'));
    if (!await dev.exists()) return notFound(c);
    return ok(c, await dev.assignPlaylist(playlistId));
  });
  app.post('/v1/playlists/:id/publish', async (c) => {
    const { items } = await c.req.json<{ items: any[] }>();
    const pl = new PlaylistEntity(c.env, c.req.param('id'));
    if (!await pl.exists()) return notFound(c);
    return ok(c, await pl.publish(items));
  });
}
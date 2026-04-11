import { Hono } from "hono";
import type { Env } from './core-utils';
import { DeviceEntity, PlaylistEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { DeviceHeartbeat } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // DEVICES
  app.get('/api/devices', async (c) => {
    await DeviceEntity.ensureSeed(c.env);
    const cq = c.req.query('cursor');
    const page = await DeviceEntity.list(c.env, cq ?? null, 50);
    return ok(c, page);
  });
  app.get('/api/devices/:id', async (c) => {
    const dev = new DeviceEntity(c.env, c.req.param('id'));
    if (!await dev.exists()) return notFound(c, 'device not found');
    return ok(c, await dev.getState());
  });
  app.post('/api/devices/:id/heartbeat', async (c) => {
    const id = c.req.param('id');
    const data = (await c.req.json()) as DeviceHeartbeat;
    const dev = new DeviceEntity(c.env, id);
    if (!await dev.exists()) {
      // Auto-register if not found during heartbeat in this simplified logic
      const newDev = await DeviceEntity.create(c.env, {
        id,
        orgId: 'org-1',
        name: `Device ${id.slice(0,4)}`,
        status: 'active' as const,
        platform: data.platform ?? 'WebPlayer',
        appVersion: data.appVersion ?? '1.0.0',
        lastHeartbeatAt: Date.now()
      });
      return ok(c, newDev);
    }
    return ok(c, await dev.heartbeat(data));
  });
  // PLAYLISTS
  app.get('/api/playlists', async (c) => {
    await PlaylistEntity.ensureSeed(c.env);
    const page = await PlaylistEntity.list(c.env, null, 50);
    return ok(c, page);
  });
  app.get('/api/playlists/:id', async (c) => {
    const pl = new PlaylistEntity(c.env, c.req.param('id'));
    if (!await pl.exists()) return notFound(c, 'playlist not found');
    return ok(c, await pl.getState());
  });
  app.get('/api/devices/:id/playlist', async (c) => {
    const dev = new DeviceEntity(c.env, c.req.param('id'));
    if (!await dev.exists()) return notFound(c, 'device not found');
    const state = await dev.getState();
    if (!state.assignedPlaylistId) return bad(c, 'no playlist assigned');
    const pl = new PlaylistEntity(c.env, state.assignedPlaylistId);
    if (!await pl.exists()) return notFound(c, 'assigned playlist missing');
    return ok(c, await pl.getState());
  });

  app.post('/api/devices/:id/assign', async (c) => {
    const playlistId = await c.req.json<{playlistId: string}>().then(d => d.playlistId);
    if (!isStr(playlistId)) return bad(c, 'Valid playlistId required');
    const pl = new PlaylistEntity(c.env, playlistId);
    if (!await pl.exists()) return bad(c, 'Playlist not found');
    const id = c.req.param('id');
    const dev = new DeviceEntity(c.env, id);
    if (!await dev.exists()) return notFound(c, 'Device not found');
    const updated = await dev.assignPlaylist(playlistId);
    return ok(c, updated);
  });
}
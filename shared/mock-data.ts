import type { Device, Playlist } from './types';
export const MOCK_PLAYLISTS: Playlist[] = [
  {
    id: 'p-1',
    name: 'Corporate Lobby Loop',
    version: 4,
    items: [
      {
        id: 'pi-1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200',
        checksum: 'h123',
        durationMs: 5000,
      },
      {
        id: 'pi-2',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=1200',
        checksum: 'h456',
        durationMs: 7000,
      },
      {
        id: 'pi-3',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        checksum: 'h789',
        durationMs: 15000,
      }
    ]
  },
  {
    id: 'p-2',
    name: 'Employee Recognition',
    version: 1,
    items: [
      {
        id: 'pi-4',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200',
        checksum: 'h321',
        durationMs: 10000,
      }
    ]
  }
];
export const MOCK_DEVICES: Device[] = [
  {
    id: 'dev-001',
    orgId: 'org-1',
    name: 'Lobby North',
    status: 'active',
    platform: 'WebOS',
    appVersion: '2.4.1',
    lastHeartbeatAt: Date.now() - 30000,
    assignedPlaylistId: 'p-1',
    telemetry: {
      cpuUsage: 12,
      memUsage: 45,
      diskUsage: 20,
      uptimeSeconds: 86400,
    }
  },
  {
    id: 'dev-002',
    orgId: 'org-1',
    name: 'Breakroom South',
    status: 'offline',
    platform: 'Tizen',
    appVersion: '2.3.0',
    lastHeartbeatAt: Date.now() - 3600000,
    assignedPlaylistId: 'p-1',
    telemetry: {
      cpuUsage: 0,
      memUsage: 0,
      diskUsage: 22,
      uptimeSeconds: 0,
    }
  },
  {
    id: 'dev-003',
    orgId: 'org-1',
    name: 'New Display X',
    status: 'pairing',
    platform: 'Android',
    appVersion: '3.0.0-beta',
    lastHeartbeatAt: Date.now() - 5000,
    telemetry: {
      cpuUsage: 5,
      memUsage: 12,
      diskUsage: 5,
      uptimeSeconds: 120,
    }
  }
];
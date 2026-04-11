import type { Device, Playlist } from './types';
export const MOCK_PLAYLISTS: Playlist[] = [
  {
    id: 'p-1',
    name: 'Corporate Lobby Loop',
    version: 4,
    updatedAt: Date.now() - 100000,
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
    name: 'OTA Update Promo',
    version: 2,
    updatedAt: Date.now() - 50000,
    items: [
      {
        id: 'pi-4',
        type: 'html',
        url: '',
        htmlContent: '<div style="background: linear-gradient(45deg, #4338CA, #10B981); height: 100vh; display: flex; align-items: center; justify-content: center; color: white; font-family: sans-serif;"><h1>OmniSign OS v2.4 Launch</h1></div>',
        checksum: 'h-html-01',
        durationMs: 10000,
      },
      {
        id: 'pi-5',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        checksum: 'h-vid-02',
        durationMs: 20000,
      }
    ]
  }
];
const now = Date.now();
const generateMetrics = () => ({
  cpu: Array.from({ length: 20 }, () => Math.floor(Math.random() * 20) + 10),
  mem: Array.from({ length: 20 }, () => Math.floor(Math.random() * 15) + 30),
  timestamps: Array.from({ length: 20 }, (_, i) => now - (19 - i) * 60000)
});
export const MOCK_DEVICES: Device[] = [
  {
    id: 'dev-001',
    orgId: 'org-1',
    name: 'Lobby North',
    status: 'active',
    platform: 'WebOS',
    appVersion: '2.4.1',
    lastHeartbeatAt: now - 30000,
    assignedPlaylistId: 'p-1',
    pairingExpiresAt: 0,
    logs: [{ id: 'l-init-1', timestamp: now - 3600000, event: 'System Boot', level: 'info' }],
    metricsHistory: generateMetrics(),
    telemetry: {
      cpuUsage: 12,
      memUsage: 45,
      diskUsage: 20,
      uptimeSeconds: 86400,
      playbackErrors: [] as string[]
    }
  },
  {
    id: 'dev-002',
    orgId: 'org-1',
    name: 'Breakroom South',
    status: 'offline',
    platform: 'Tizen',
    appVersion: '2.3.0',
    lastHeartbeatAt: now - 600000,
    assignedPlaylistId: 'p-1',
    pairingExpiresAt: 0,
    logs: [{ id: 'l-init-2', timestamp: now - 7200000, event: 'Watchdog Timeout', level: 'error' }],
    metricsHistory: generateMetrics(),
    telemetry: {
      cpuUsage: 0,
      memUsage: 0,
      diskUsage: 22,
      uptimeSeconds: 0,
      playbackErrors: [] as string[]
    }
  },
  {
    id: 'dev-003',
    orgId: 'org-1',
    name: 'New Display X',
    status: 'pairing',
    platform: 'Android',
    appVersion: '3.0.0-beta',
    lastHeartbeatAt: now - 5000,
    pairingExpiresAt: now + 600000,
    logs: [{ id: 'l-init-3', timestamp: now - 5000, event: 'Pairing Initiated', level: 'info' }],
    metricsHistory: generateMetrics(),
    telemetry: {
      cpuUsage: 5,
      memUsage: 12,
      diskUsage: 5,
      uptimeSeconds: 120,
      playbackErrors: [] as string[]
    }
  }
];
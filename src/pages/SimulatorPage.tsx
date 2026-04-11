import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, saveAuth } from '@/lib/api-client';
import type { Playlist, PlaylistItem, Manifest, Device, DeviceInitResponse } from '@shared/types';
import { Activity, ShieldCheck, Database, ServerCrash, RefreshCw, Cpu, HardDrive, Key, QrCode, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
export function SimulatorPage() {
  const { id } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deviceState, setDeviceState] = useState<Device | null>(null);
  const [pairingInfo, setPairingInfo] = useState<DeviceInitResponse | null>(null);
  const [cache, setCache] = useState<{hash: string, integrity: boolean}[]>([]);
  const [isBooting, setIsBooting] = useState(true);
  // Initial Boot/Check Flow
  useEffect(() => {
    const boot = async () => {
      try {
        const dev = await api<Device>(`/v1/devices/${id}`).catch(() => null);
        if (!dev || dev.status === 'new' || dev.status === 'pairing') {
          const init = await api<DeviceInitResponse>(`/v1/devices/init`, {
            method: 'POST',
            body: JSON.stringify({ platform: 'SimulatorMesh', appVersion: '2.4.0', publicKey: 'mock-pub-key' })
          });
          setPairingInfo(init);
        } else {
          setDeviceState(dev);
        }
      } catch (e) {
        console.error("Boot error", e);
      } finally {
        setTimeout(() => setIsBooting(false), 2000);
      }
    };
    boot();
  }, [id]);
  const { data: manifest, error } = useQuery({
    queryKey: ['simulator-playlist', id],
    queryFn: async () => {
      setIsUpdating(true);
      try {
        const data = await api<Manifest>(`/v1/devices/${id}/playlist`);
        // Simulate caching
        data.playlist.items.forEach(item => {
          if (!cache.find(c => c.hash === item.checksum)) {
            setCache(prev => [{ hash: item.checksum, integrity: Math.random() > 0.1 }, ...prev].slice(0, 10));
          }
        });
        return data;
      } finally {
        setTimeout(() => setIsUpdating(false), 1500);
      }
    },
    enabled: deviceState?.status === 'active',
    refetchInterval: 30000,
  });
  // Heartbeat Loop
  useEffect(() => {
    if (isBooting) return;
    const hb = setInterval(async () => {
      try {
        const updated = await api<Device>(`/v1/devices/${id}/heartbeat`, {
          method: 'POST',
          body: JSON.stringify({
            status: deviceState?.status || 'pairing',
            platform: 'SimulatorMesh',
            appVersion: '2.4.0',
            telemetry: {
              cpuUsage: Math.floor(Math.random() * 15) + 5,
              memUsage: 32, diskUsage: 18, uptimeSeconds: 3600, playbackErrors: []
            }
          })
        });
        if (updated.status === 'active' && deviceState?.status !== 'active') {
          if (updated.accessToken) saveAuth(id!, updated.accessToken);
          setDeviceState(updated);
          toast.success("Identity Verified: Node Authorized");
        }
      </div> catch (e) { /* silent fail */ }
    }, 10000);
    return () => clearInterval(hb);
  }, [id, deviceState, isBooting]);
  // Playback & Watchdog
  useEffect(() => {
    if (!manifest?.playlist?.items.length) return;
    const item = manifest.playlist.items[currentIndex];
    // Watchdog trigger simulation
    const watchdog = setTimeout(() => {
      toast.error("Watchdog: Frame Stall. Recovering...");
      setCurrentIndex(prev => (prev + 1) % manifest.playlist.items.length);
    }, item.durationMs + 4000);
    const timer = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % manifest.playlist.items.length);
    }, item.durationMs);
    return () => { clearTimeout(timer); clearTimeout(watchdog); };
  }, [manifest, currentIndex]);
  if (isBooting) return (
    <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-white font-mono gap-4">
      <RefreshCw className="animate-spin opacity-50" size={48} />
      <div className="text-xl tracking-widest animate-pulse">BOOTING_CORE_MESH_OS</div>
    </div>
  );
  if (!deviceState || deviceState.status === 'pairing') return (
    <div className="w-screen h-screen bg-[#0F172A] flex flex-col items-center justify-center text-white p-12">
      <div className="max-w-md w-full bg-white/5 border border-white/10 p-10 rounded-3xl text-center space-y-8 backdrop-blur-xl">
        <div className="mx-auto w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center shadow-glow"><Key size={40} /></div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Waiting for Orchestration</h2>
          <p className="text-zinc-400 text-sm">Hardware ready. Provisioning required via OmniSign CMS.</p>
        </div>
        <div className="p-8 bg-white text-black rounded-2xl mx-auto w-fit shadow-2xl">
          <QrCode size={160} />
          <div className="mt-4 text-3xl font-black tracking-[0.4em]">{pairingInfo?.pairingCode || '------'}</div>
        </div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Device ID: {id}</div>
      </div>
    </div>
  );
  const activeItem = manifest?.playlist.items[currentIndex];
  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative select-none">
      <AnimatePresence mode="wait">
        {activeItem && (
          <motion.div
            key={activeItem.id}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: activeItem.transition === 'fade' ? 1 : 0 }}
            className="absolute inset-0"
          >
            {activeItem.type === 'image' && <img src={activeItem.url} className="w-full h-full object-cover" />}
            {activeItem.type === 'video' && <video src={activeItem.url} autoPlay muted loop className="w-full h-full object-cover" />}
            {activeItem.type === 'html' && <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: activeItem.htmlContent || '' }} />}
            {activeItem.type === 'url' && <iframe src={activeItem.url} className="w-full h-full border-0" />}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute top-8 left-8 p-6 bg-black/80 backdrop-blur-md border border-white/10 text-white font-mono text-[10px] rounded-xl w-[340px] shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="flex items-center gap-2 font-bold text-indigo-400"><Activity size={12} /> SCREENMESH SIM</span>
          <span className="text-emerald-400">● {deviceState.status.toUpperCase()}</span>
        </div>
        <div className="grid grid-cols-2 gap-y-1">
          <span className="text-zinc-500 uppercase">Integrity</span>
          <span className="text-right flex items-center justify-end gap-1"><ShieldCheck size={10} className="text-emerald-500" /> VALIDATED</span>
          <span className="text-zinc-500 uppercase">Cache</span>
          <span className="text-right">{cache.length} Assets</span>
        </div>
        <div className="space-y-2">
          <div className="text-zinc-500 uppercase font-bold text-[8px] flex items-center justify-between">
            <span>Cache LRU Stack</span>
            <HardDrive size={10} />
          </div>
          <div className="space-y-1">
            {cache.slice(0, 4).map(c => (
              <div key={c.hash} className="flex justify-between items-center bg-white/5 p-1 px-2 rounded">
                <span className="text-zinc-400 uppercase">{c.hash}</span>
                {c.integrity ? <ShieldCheck size={10} className="text-emerald-500" /> : <AlertTriangle size={10} className="text-rose-500" />}
              </div>
            ))}
          </div>
        </div>
        {activeItem && (
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[8px] text-zinc-500">
              <span>ACTIVE_MANIFEST_VERSION</span>
              <span className="text-indigo-300">v{manifest?.playlist.version}</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                key={`p-${activeItem.id}`}
                className="h-full bg-indigo-500"
                initial={{ width: 0 }} animate={{ width: '100%' }}
                transition={{ duration: activeItem.durationMs / 1000, ease: "linear" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
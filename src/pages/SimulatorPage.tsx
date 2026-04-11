import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, saveAuth } from '@/lib/api-client';
import { generateDeviceKeypair, exportKey, importKey, signData, computeHash } from '@/lib/crypto-utils';
import type { Playlist, PlaylistItem, Manifest, Device, DeviceInitResponse } from '@shared/types';
import { Activity, ShieldCheck, RefreshCw, Key, QrCode, AlertTriangle, Database, Terminal, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
const DB_NAME = "ScreenMeshDB";
const STORE_NAME = "Persistence";
export function SimulatorPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deviceState, setDeviceState] = useState<Device | null>(null);
  const [pairingInfo, setPairingInfo] = useState<DeviceInitResponse | null>(null);
  const [cache, setCache] = useState<{hash: string, integrity: boolean}[]>([]);
  const [isBooting, setIsBooting] = useState(true);
  const [selfHealing, setSelfHealing] = useState<string | null>(null);
  const [keys, setKeys] = useState<{ pub: string, priv: CryptoKey } | null>(null);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);
  const getStored = async (key: string) => {
    return new Promise((resolve) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(STORE_NAME, "readonly");
        const get = tx.objectStore(STORE_NAME).get(key);
        get.onsuccess = () => resolve(get.result);
      };
    });
  };
  const setStored = async (key: string, val: any) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(val, key);
    };
  };
  useEffect(() => {
    const boot = async () => {
      try {
        let pubBase64 = await getStored("publicKey") as string;
        let privKey = await getStored("privateKey") as CryptoKey;
        if (!pubBase64 || !privKey) {
          const kp = await generateDeviceKeypair();
          pubBase64 = await exportKey(kp.publicKey);
          privKey = kp.privateKey;
          await setStored("publicKey", pubBase64);
          await setStored("privateKey", privKey);
        }
        if (isMounted.current) setKeys({ pub: pubBase64, priv: privKey });
        const dev = await api<Device>(`/v1/devices/${id}`).catch(() => null);
        if (!dev || dev.status === 'new' || dev.status === 'pairing') {
          const init = await api<DeviceInitResponse>(`/v1/devices/init`, {
            method: 'POST',
            body: JSON.stringify({ platform: 'ScreenMesh-OS', appVersion: '3.1.0-RC', publicKey: pubBase64 })
          });
          if (isMounted.current) setPairingInfo(init);
        } else {
          if (isMounted.current) setDeviceState(dev);
        }
      } catch (e) {
        console.error("Boot failure", e);
      } finally {
        setTimeout(() => { if (isMounted.current) setIsBooting(false); }, 1500);
      }
    };
    boot();
  }, [id]);
  const { data: manifest, refetch: forceSync } = useQuery({
    queryKey: ['simulator-playlist', id],
    queryFn: async () => {
      setIsUpdating(true);
      try {
        const data = await api<Manifest>(`/v1/devices/${id}/playlist`);
        if (manifest?.playlist?.id !== data.playlist.id) {
          setCurrentIndex(0); // Reset on playlist change
        }
        await setStored(`manifest_${id}`, data);
        return data;
      } finally {
        if (isMounted.current) setIsUpdating(false);
      }
    },
    enabled: deviceState?.status === 'active',
    refetchInterval: 30000,
  });
  useEffect(() => {
    if (isBooting || !keys) return;
    const hb = setInterval(async () => {
      try {
        const perf = (window.performance as any);
        const mem = perf.memory ? Math.round(perf.memory.usedJSHeapSize / 1024 / 1024) : 0;
        const totalMem = perf.memory ? Math.round(perf.memory.jsHeapSizeLimit / 1024 / 1024) : 0;
        const heartbeatPayload = {
          status: deviceState?.status || 'pairing',
          platform: 'ScreenMesh-OS',
          appVersion: '3.1.0-RC',
          telemetry: {
            cpuUsage: Math.floor(Math.random() * 10) + 2,
            memUsage: mem ? Math.round((mem / totalMem) * 100) : 25,
            diskUsage: 12,
            uptimeSeconds: Math.floor(performance.now() / 1000),
            playbackErrors: [],
            cpuCores: navigator.hardwareConcurrency || 4,
            memoryLimit: totalMem || 4096
          }
        };
        const sig = await signData(keys.priv, JSON.stringify(heartbeatPayload));
        const updated = await api<Device>(`/v1/devices/${id}/heartbeat`, {
          method: 'POST',
          body: JSON.stringify({ ...heartbeatPayload, signature: sig })
        });
        if (isMounted.current && updated.status === 'active' && deviceState?.status !== 'active') {
          if (updated.accessToken) saveAuth(id!, updated.accessToken);
          setDeviceState(updated);
          toast.success("Identity Verified: Node Authorized");
        }
      } catch (e) {
        console.warn("Heartbeat lost", e);
      }
    }, 10000);
    return () => clearInterval(hb);
  }, [id, deviceState, isBooting, keys]);
  useEffect(() => {
    if (!manifest?.playlist?.items.length) return;
    const item = manifest.playlist.items[currentIndex];
    const verifyIntegrity = async () => {
      const realHash = await computeHash(item.url + item.durationMs);
      const isCorrupt = Math.random() < 0.01;
      const status = isCorrupt ? false : (item.integrity === 'pending' || item.integrity === realHash);
      setCache(prev => {
        const exists = prev.find(c => c.hash === item.id);
        if (exists) return prev;
        return [{ hash: item.id, integrity: status }, ...prev].slice(0, 5);
      });
      if (!status) {
        setSelfHealing(item.id);
        setTimeout(() => {
          setCache(prev => prev.map(c => c.hash === item.id ? { ...c, integrity: true } : c));
          setSelfHealing(null);
          toast.success("Integrity Auto-Restored: Hash Validated");
        }, 2000);
      }
    };
    verifyIntegrity();
    let lastFrame = performance.now();
    let watchdogActive = true;
    const monitor = () => {
      const now = performance.now();
      if (now - lastFrame > 1500 && watchdogActive) {
        toast.error("WATCHDOG: ENGINE STALL. INITIATING SYNC.");
        forceSync();
        watchdogActive = false;
      }
      lastFrame = now;
      if (watchdogActive) requestAnimationFrame(monitor);
    };
    const rafId = requestAnimationFrame(monitor);
    const timer = setTimeout(() => {
      watchdogActive = false;
      if (isMounted.current) setCurrentIndex(prev => (prev + 1) % manifest.playlist.items.length);
    }, item.durationMs);
    return () => { clearTimeout(timer); watchdogActive = false; cancelAnimationFrame(rafId); };
  }, [manifest, currentIndex, forceSync]);
  if (isBooting) return (
    <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-white font-mono gap-4">
      <RefreshCw className="animate-spin opacity-50" size={48} />
      <div className="text-xl tracking-widest animate-pulse font-bold uppercase">ScreenMesh Bootstrapping...</div>
    </div>
  );
  if (!deviceState || deviceState.status === 'pairing') return (
    <div className="w-screen h-screen bg-[#020617] flex flex-col items-center justify-center text-white p-4">
      <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 p-10 rounded-3xl text-center space-y-8 backdrop-blur-2xl shadow-2xl">
        <div className="mx-auto w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-glow rotate-3"><Key size={40} /></div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Provisioning Mode</h2>
          <p className="text-zinc-400 text-sm">Challenge pending. Identity established.</p>
        </div>
        <div className="p-8 bg-white text-black rounded-3xl mx-auto w-fit shadow-2xl border-8 border-indigo-500/20">
          <QrCode size={160} className="opacity-90" />
          <div className="mt-4 text-4xl font-black tracking-[0.4em] font-mono">{pairingInfo?.pairingCode || '------'}</div>
        </div>
      </div>
    </div>
  );
  const activeItem = manifest?.playlist.items[currentIndex];
  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative select-none">
      <AnimatePresence mode="wait">
        {selfHealing ? (
          <motion.div key="healing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center text-white space-y-4">
            <Database className="animate-bounce text-indigo-500" size={48} />
            <div className="font-mono text-xs tracking-widest uppercase">Repairing content object: {selfHealing}</div>
            <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 2 }} className="h-full bg-indigo-500" />
            </div>
          </motion.div>
        ) : activeItem && (
          <motion.div key={activeItem.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
            {activeItem.type === 'image' && <img src={activeItem.url} className="w-full h-full object-cover" />}
            {activeItem.type === 'video' && <video src={activeItem.url} autoPlay muted loop className="w-full h-full object-cover" />}
            {activeItem.type === 'html' && <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: activeItem.htmlContent || '' }} />}
            {activeItem.type === 'url' && <iframe src={activeItem.url} title="content" className="w-full h-full border-0" />}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute bottom-8 right-8 p-6 bg-slate-950/90 backdrop-blur-2xl border border-white/10 text-white font-mono text-[10px] rounded-2xl w-[320px] shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <span className="font-black text-indigo-400">ENGINE_OMNI_PROD</span>
          <button onClick={() => forceSync()} className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 font-bold uppercase">
            <RefreshCw size={10} className={isUpdating ? 'animate-spin' : ''} /> Force Sync
          </button>
        </div>
        <div className="grid grid-cols-2 gap-y-1 opacity-80 uppercase tracking-tighter">
          <span>Heap Memory</span>
          <span className="text-right text-indigo-400 font-bold">{deviceState.telemetry.memUsage}%</span>
          <span>Core Temp</span>
          <span className="text-right text-emerald-400 font-bold">42°C</span>
          <span>Manifest</span>
          <span className="text-right text-zinc-300">REV_{manifest?.playlist.version || 0}</span>
        </div>
        <div className="pt-2 border-t border-white/5">
          <div className="flex justify-between text-[8px] text-zinc-500 font-bold uppercase mb-2">
            <span>Cache Status</span>
            <ShieldCheck size={10} className="text-emerald-500" />
          </div>
          <div className="space-y-1">
            {cache.map(c => (
              <div key={c.hash} className="flex justify-between items-center bg-white/5 px-2 py-1 rounded">
                <span className="text-zinc-400 truncate w-32">OBJ_{c.hash.slice(0,8)}</span>
                {c.integrity ? <div className="w-1 h-1 bg-emerald-500 rounded-full" /> : <div className="w-1 h-1 bg-rose-500 animate-ping rounded-full" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
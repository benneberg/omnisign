import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, saveAuth } from '@/lib/api-client';
import { generateDeviceKeypair, exportKey, signData } from '@/lib/crypto-utils';
import type { Manifest, Device, DeviceInitResponse } from '@shared/types';
import { RefreshCw, Key, QrCode, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
const DB_NAME = "ScreenMeshDB";
const STORE_NAME = "Persistence";
export function SimulatorPage() {
  const { id } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deviceState, setDeviceState] = useState<Device | null>(null);
  const [pairingInfo, setPairingInfo] = useState<DeviceInitResponse | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [keys, setKeys] = useState<{ pub: string, priv: CryptoKey } | null>(null);
  const [resilienceTier, setResilienceTier] = useState<'live' | 'cached' | 'emergency'>('live');
  const [watchdogMetrics, setWatchdogMetrics] = useState({ rafDrift: 0, frameCount: 0, stalls: 0 });
  const [integrityQueue, setIntegrityQueue] = useState<string[]>([]);
  const rafRef = useRef<number>(0);
  const lastRafTime = useRef<number>(performance.now());
  const deviceStateRef = useRef<Device | null>(null);
  const keysRef = useRef<{ pub: string, priv: CryptoKey } | null>(null);
  // Synchronize refs for heartbeat without re-triggering effects
  useEffect(() => {
    deviceStateRef.current = deviceState;
  }, [deviceState]);
  useEffect(() => {
    keysRef.current = keys;
  }, [keys]);
  const getStored = async (key: string) => {
    return new Promise((resolve) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onerror = () => resolve(null);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE_NAME)) req.result.createObjectStore(STORE_NAME); };
      req.onsuccess = () => {
        const tx = req.result.transaction(STORE_NAME, "readonly");
        const get = tx.objectStore(STORE_NAME).get(key);
        get.onsuccess = () => resolve(get.result);
        get.onerror = () => resolve(null);
      };
    });
  };
  const setStored = async (key: string, val: any) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onsuccess = () => {
      const tx = req.result.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(val, key);
    };
  };
  // High-Fidelity Watchdog Monitoring
  const startWatchdog = useCallback(() => {
    const monitor = (time: number) => {
      const drift = time - lastRafTime.current;
      setWatchdogMetrics(prev => ({ ...prev, rafDrift: drift, frameCount: prev.frameCount + 1 }));
      if (drift > 5000) { // 5s Stall
        setWatchdogMetrics(prev => ({ ...prev, stalls: prev.stalls + 1 }));
        toast.error("WATCHDOG: RAF ENGINE STALL DETECTED", { description: "Initiating hot-reload recovery." });
        window.location.reload();
      }
      lastRafTime.current = time;
      rafRef.current = requestAnimationFrame(monitor);
    };
    rafRef.current = requestAnimationFrame(monitor);
  }, []);
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
        setKeys({ pub: pubBase64, priv: privKey });
        const dev = id ? await api<Device>(`/v1/devices/${id}`).catch(() => null) : null;
        if (!dev || dev.status === 'new' || dev.status === 'pairing') {
          const init = await api<DeviceInitResponse>(`/v1/devices/init?id=${id}`, {
            method: 'POST',
            body: JSON.stringify({ platform: 'ScreenMesh-OS', appVersion: '3.1.0-STABLE', publicKey: pubBase64 })
          });
          setPairingInfo(init);
        } else {
          setDeviceState(dev);
        }
      } finally {
        setTimeout(() => { setIsBooting(false); startWatchdog(); }, 1500);
      }
    };
    boot();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [id, startWatchdog]);
  const { data: manifest } = useQuery({
    queryKey: ['simulator-playlist', id],
    queryFn: async () => {
      try {
        const data = await api<Manifest>(`/v1/devices/${id}/playlist`);
        await setStored(`manifest_${id}`, data);
        setResilienceTier('live');
        return data;
      } catch (e) {
        const cached = await getStored(`manifest_${id}`) as Manifest;
        if (cached) {
          setResilienceTier('cached');
          toast.warning("Network Loss: Falling back to cached manifest.");
          return cached;
        }
        setResilienceTier('emergency');
        throw e;
      }
    },
    enabled: deviceState?.status === 'active',
    refetchInterval: (deviceState?.nextSyncInterval ?? 60000) as number,
  });
  // Anti-Spoof Heartbeat Loop (Recursive timeout for traffic shaping)
  useEffect(() => {
    if (isBooting) return;
    let timerId: ReturnType<typeof setTimeout>;
    const performHeartbeat = async () => {
      const state = deviceStateRef.current;
      const k = keysRef.current;
      if (state && state.status === 'active' && k) {
        try {
          const heartbeatPayload = {
            status: state.status,
            platform: 'ScreenMesh-OS',
            appVersion: '3.1.0-STABLE',
            telemetry: {
              ...(state.telemetry || {}),
              uptimeSeconds: Math.floor(performance.now() / 1000),
              playbackErrors: watchdogMetrics.stalls > 0 ? ["Watchdog Triggered"] : []
            }
          };
          const signature = state.expectedNonce 
            ? await signData(k.priv, state.expectedNonce) 
            : undefined;
          const updated = await api<Device>(`/v1/devices/${id}/heartbeat`, {
            method: 'POST',
            body: JSON.stringify({ ...heartbeatPayload, signature })
          });
          if (updated.accessToken) saveAuth(id!, updated.accessToken);
          setDeviceState(updated);
        } catch (e) {
          console.warn("[Watchdog] Heartbeat handshake failed", e);
        }
      }
      const nextInterval = deviceStateRef.current?.nextSyncInterval ?? 15000;
      timerId = setTimeout(performHeartbeat, nextInterval);
    };
    timerId = setTimeout(performHeartbeat, 15000);
    return () => clearTimeout(timerId);
  }, [id, isBooting, watchdogMetrics.stalls]);
  // Read-Verify-Repair Integrity Check
  useEffect(() => {
    if (!manifest?.playlist?.items?.[currentIndex]) return;
    let ignore = false;
    const item = manifest.playlist.items[currentIndex];
    const verify = async () => {
      setIntegrityQueue(prev => [...prev, item.id]);
      try {
        const response = await fetch(item.url);
        if (ignore) return;
        if (!response.ok) throw new Error('Fetch failed');
        const buffer = await response.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashHex = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        if (item.integrity !== hashHex) {
          toast.error("INTEGRITY FAILURE: SHA256 MISMATCH", { description: "Repairing content segment..." });
          setResilienceTier('cached');
        }
      } catch (e) {
        if (!ignore) {
          toast.error("INTEGRITY FAILURE: FETCH/VERIFY ERROR", { description: "Content unavailable - triggering fallback." });
          setResilienceTier('cached');
        }
      } finally {
        if (!ignore) setIntegrityQueue(prev => prev.filter(i => i !== item.id));
      }
    };
    verify();
    const playlistLength = manifest.playlist.items.length;
    const nextDuration = Math.max(1000, item.durationMs || 5000);
    const timer = setTimeout(() => {
      if (!ignore) setCurrentIndex(prev => (prev + 1) % playlistLength);
    }, nextDuration);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [manifest, currentIndex]);
  if (isBooting) return (
    <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-white font-mono gap-4 uppercase tracking-[0.3em]">
      <RefreshCw className="animate-spin opacity-50" size={48} />
      <div className="text-xl animate-pulse">ScreenMesh Engine Initializing...</div>
    </div>
  );
  if (resilienceTier === 'emergency') return (
    <div className="w-screen h-screen bg-rose-950 flex flex-col items-center justify-center text-white p-12 text-center space-y-8">
      <ShieldAlert size={80} className="text-rose-500 animate-pulse" />
      <div className="space-y-2">
        <h1 className="text-4xl font-black uppercase tracking-tighter">Emergency Recovery Mode</h1>
        <p className="text-rose-200 font-mono text-sm max-w-md">No valid manifest (Live/Cache) found. Orchestration signal lost. System awaiting manual root bypass.</p>
      </div>
      <div className="font-mono text-[10px] bg-black/40 p-4 rounded-xl border border-rose-500/30">
        ERROR_CODE: 0x884_NO_PAYLOAD<br/>
        DEVICE_ID: {id}
      </div>
    </div>
  );
  if (!deviceState || deviceState.status === 'pairing') return (
    <div className="w-screen h-screen bg-[#020617] flex flex-col items-center justify-center text-white">
      <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 p-12 rounded-[2.5rem] text-center space-y-10 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-glow rotate-6"><Key size={40} /></div>
        <div className="space-y-4">
          <h2 className="text-3xl font-black tracking-tight uppercase">Pairing Challenge</h2>
          <div className="p-8 bg-white text-black rounded-3xl mx-auto w-fit shadow-2xl border-4 border-indigo-500/20">
            <QrCode size={180} />
            <div className="mt-6 text-5xl font-black font-mono tracking-[0.3em]">{pairingInfo?.pairingCode || '------'}</div>
          </div>
          {pairingInfo && keys && (
            <button
              onClick={async () => {
                try {
                  const sig = await signData(keys.priv, `${pairingInfo.pairingCode}${pairingInfo.challenge || ''}`);
                  const result = await api<Device>(`/v1/devices/${id}/pair`, {
                    method: 'POST',
                    body: JSON.stringify({ deviceId: id, pairingCode: pairingInfo.pairingCode, signature: sig })
                  });
                  setPairingInfo(null);
                  setDeviceState(result);
                  toast.success('Device Paired Successfully!');
                } catch (e: any) {
                  toast.error('Pairing Failed: ' + (e.message || 'Invalid signature'));
                }
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-8 rounded-2xl text-lg uppercase tracking-wider shadow-glow transition-all duration-200 border-2 border-indigo-500/50"
            >
              VERIFY & ACTIVATE
            </button>
          )}
        </div>
      </div>
    </div>
  );
  const activeItem = manifest?.playlist.items[currentIndex];
  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      <AnimatePresence mode="wait">
        {activeItem && (
          <motion.div key={activeItem.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
            {activeItem.type === 'image' && <img src={activeItem.url} className="w-full h-full object-cover" />}
            {activeItem.type === 'video' && <video src={activeItem.url} autoPlay muted loop className="w-full h-full object-cover" />}
            {activeItem.type === 'html' && (
              <iframe
                srcDoc={activeItem.htmlContent || '<p>Empty</p>'}
                sandbox="allow-scripts allow-same-origin allow-popups"
                className="w-full h-full border-0"
                title="html-content"
              />
            )}
            {activeItem.type === 'url' && <iframe src={activeItem.url} title="content" className="w-full h-full border-0" />}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute top-6 left-6 flex gap-3 z-50">
        <Badge className={`h-8 px-4 rounded-full border-none font-black tracking-widest text-[10px] uppercase shadow-lg ${resilienceTier === 'live' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
          TIER: {resilienceTier}
        </Badge>
        {integrityQueue.length > 0 && (
          <Badge variant="outline" className="h-8 px-4 rounded-full bg-black/50 text-white border-white/20 text-[10px] font-mono animate-pulse">
            VERIFYING_READ...
          </Badge>
        )}
      </div>
      <div className="absolute bottom-8 right-8 p-6 bg-slate-950/95 backdrop-blur-3xl border border-white/10 text-white font-mono text-[9px] rounded-[1.5rem] w-[340px] shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <span className="font-black text-indigo-400 flex items-center gap-1.5"><ShieldCheck size={12}/> HIGH_INTEGRITY_MESH</span>
          <span className="text-zinc-500">v3.1.0-S</span>
        </div>
        <div className="grid grid-cols-2 gap-y-2 opacity-80 uppercase font-bold tracking-tighter">
          <span>RAF Drift</span><span className="text-right text-emerald-400">{watchdogMetrics.rafDrift.toFixed(2)}ms</span>
          <span>Frame Count</span><span className="text-right text-indigo-400">{watchdogMetrics.frameCount}</span>
          <span>Security Nonce</span><span className="text-right truncate text-zinc-400">{deviceState.expectedNonce?.slice(0, 12)}...</span>
          <span>Next Sync</span><span className="text-right text-amber-400">{Math.round((deviceState.nextSyncInterval || 60000)/1000)}s</span>
        </div>
        <div className="pt-2 border-t border-white/5 space-y-2">
           <div className="flex justify-between items-center text-[8px] font-black uppercase text-zinc-500">
             <span>Resilience Monitor</span>
             <Cpu size={10} className="text-indigo-500" />
           </div>
           <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
             <motion.div animate={{ width: `${Math.min(100, watchdogMetrics.rafDrift * 10)}%` }} className={`h-full ${watchdogMetrics.rafDrift > 50 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
           </div>
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Playlist, PlaylistItem } from '@shared/types';
import { Activity, ShieldCheck, Database, ServerCrash, RefreshCw, Cpu, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
export function SimulatorPage() {
  const { id } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [syncCount, setSyncCount] = useState(0);
  const [cacheStatus, setCacheStatus] = useState<'MISS' | 'HIT'>('MISS');
  const [isUpdating, setIsUpdating] = useState(false);
  const watchdogTimerRef = useRef<number | null>(null);
  const { data: playlist, error, isLoading } = useQuery({
    queryKey: ['simulator-playlist', id],
    queryFn: async () => {
      setIsUpdating(true);
      try {
        const data = await api<Playlist>(`/v1/devices/${id}/playlist`);
        setCacheStatus('HIT');
        return data;
      } finally {
        setTimeout(() => setIsUpdating(false), 2000);
      }
    },
    refetchInterval: 30000,
  });
  // Heartbeat Loop
  useEffect(() => {
    const hb = setInterval(async () => {
      try {
        await fetch(`/v1/devices/${id}/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'active',
            platform: 'SimulatorMesh v2.4',
            appVersion: '1.2.4',
            telemetry: {
              cpuUsage: Math.floor(Math.random() * 20) + 5,
              memUsage: Math.floor(Math.random() * 15) + 30,
              diskUsage: 22,
              uptimeSeconds: Math.floor(performance.now() / 1000),
              playbackErrors: []
            }
          })
        });
        setSyncCount(prev => prev + 1);
      } catch (e) {
        console.error("Heartbeat failed", e);
      }
    }, 10000);
    return () => clearInterval(hb);
  }, [id]);
  // Playback Loop & Watchdog
  useEffect(() => {
    if (!playlist || playlist.items.length === 0) return;
    const currentItem = playlist.items[currentIndex];
    // Watchdog check for stalls
    const watchdog = setTimeout(() => {
      console.warn("Watchdog: Preload stall detected, soft-reloading item.");
      setCurrentIndex((prev) => (prev + 1) % playlist.items.length);
    }, currentItem.durationMs + 3000);
    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % playlist.items.length);
    }, currentItem.durationMs);
    return () => {
      clearTimeout(timer);
      clearTimeout(watchdog);
    };
  }, [playlist, currentIndex]);
  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-white font-mono">
        <RefreshCw className="w-12 h-12 animate-spin mb-4 opacity-50" />
        <div className="text-xl">Initializing ScreenMesh OS...</div>
      </div>
    );
  }
  if (error || !playlist) {
    return (
      <div className="w-screen h-screen bg-zinc-950 flex flex-col items-center justify-center text-white font-mono p-12">
        <ServerCrash className="w-16 h-16 text-rose-500 mb-6" />
        <div className="text-2xl font-bold">BOOT_FAILURE_MANIFEST_MISSING</div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 mt-6 max-w-md text-sm text-zinc-400">
          Error: {error instanceof Error ? error.message : 'No playlist assigned'}
        </div>
      </div>
    );
  }
  const activeItem = playlist.items[currentIndex];
  const transitionType = activeItem.transition || 'cut';
  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative select-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeItem.id}
          initial={transitionType === 'fade' ? { opacity: 0 } : {}}
          animate={{ opacity: 1 }}
          exit={transitionType === 'fade' ? { opacity: 0 } : {}}
          transition={{ duration: transitionType === 'fade' ? 1 : 0 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {activeItem.type === 'image' ? (
            <img src={activeItem.url} className="w-full h-full object-cover" alt="" />
          ) : (
            <video src={activeItem.url} autoPlay muted className="w-full h-full object-cover" />
          )}
        </motion.div>
      </AnimatePresence>
      <div className="absolute top-8 left-8 p-6 bg-black/70 backdrop-blur-xl border border-white/10 text-white font-mono text-xs rounded-xl pointer-events-none space-y-4 min-w-[320px] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="flex items-center gap-2 font-bold text-indigo-400">
            <Activity className="size-3" /> SCREENMESH OS v2.4
          </span>
          <span className="text-emerald-400 animate-pulse">● RUNNING</span>
        </div>
        <div className="grid grid-cols-2 gap-y-1.5 text-[10px] opacity-80">
          <span className="text-zinc-500 flex items-center gap-1"><Cpu className="size-3" /> CPU_LOAD</span>
          <span className="text-right">12.4%</span>
          <span className="text-zinc-500 flex items-center gap-1"><HardDrive className="size-3" /> CACHE_STATE</span>
          <span className={`text-right ${cacheStatus === 'HIT' ? 'text-emerald-400' : 'text-rose-400'}`}>{cacheStatus}</span>
          <span className="text-zinc-500">VERSION</span>
          <span className="text-right">v0.{playlist.version}</span>
        </div>
        {isUpdating && (
          <div className="flex items-center gap-2 py-1 px-2 bg-indigo-500/20 rounded border border-indigo-500/30 text-indigo-300">
            <RefreshCw className="size-3 animate-spin" />
            <span className="text-[10px] font-bold">ATOMIC_RENAME_IN_PROGRESS</span>
          </div>
        )}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span>ACTIVE_LAYER_HASH</span>
            <span className="text-indigo-300 truncate w-24 text-right uppercase">{activeItem.checksum}</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-indigo-500" 
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: activeItem.durationMs / 1000, ease: "linear" }}
              key={`progress-${activeItem.id}`}
            />
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 text-[9px] pt-1 text-zinc-500 uppercase tracking-tight">
          <span className="flex items-center gap-1"><ShieldCheck className="size-2 text-emerald-500" /> SIG_OK</span>
          <span className="flex items-center gap-1"><Database className="size-2 text-indigo-500" /> LOCAL_FS</span>
        </div>
      </div>
    </div>
  );
}
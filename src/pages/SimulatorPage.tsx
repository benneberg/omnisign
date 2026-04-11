import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Playlist, PlaylistItem, Device } from '@shared/types';
import { Activity, ShieldCheck, Database, ServerCrash, RefreshCw } from 'lucide-react';
export function SimulatorPage() {
  const { id } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [syncCount, setSyncCount] = useState(0);
  const timerRef = useRef<number | null>(null);
  const { data: playlist, error, isLoading } = useQuery({
    queryKey: ['simulator-playlist', id],
    queryFn: () => api<Playlist>(`/api/devices/${id}/playlist`),
    refetchInterval: 30000, // Poll for manifest updates every 30s
  });
  // Heartbeat Loop
  useEffect(() => {
    const hb = setInterval(async () => {
      try {
        await fetch(`/api/devices/${id}/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'active',
            telemetry: {
              cpuUsage: Math.floor(Math.random() * 20) + 5,
              memUsage: Math.floor(Math.random() * 15) + 30,
              diskUsage: 22,
              uptimeSeconds: Math.floor(performance.now() / 1000)
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
  // Playback Loop
  useEffect(() => {
    if (!playlist || playlist.items.length === 0) return;
    const currentItem = playlist.items[currentIndex];
    timerRef.current = window.setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % playlist.items.length);
    }, currentItem.durationMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playlist, currentIndex]);
  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-white font-mono">
        <RefreshCw className="w-12 h-12 animate-spin mb-4 opacity-50" />
        <div className="text-xl">Initializing ScreenMesh OS...</div>
        <div className="text-xs text-zinc-500 mt-2">Connecting to Control Plane...</div>
      </div>
    );
  }
  if (error || !playlist) {
    return (
      <div className="w-screen h-screen bg-zinc-950 flex flex-col items-center justify-center text-white font-mono p-12">
        <ServerCrash className="w-16 h-16 text-rose-500 mb-6" />
        <div className="text-2xl font-bold">BOOT_FAILURE_MANIFEST_MISSING</div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 mt-6 max-w-md text-sm text-zinc-400">
          Device ID: {id}<br/>
          Error: {error instanceof Error ? error.message : 'No playlist assigned'}<br/>
          Action: Assign a playlist in the OmniSign CMS.
        </div>
      </div>
    );
  }
  const activeItem = playlist.items[currentIndex];
  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative select-none">
      {/* Playback Layer */}
      <div className="absolute inset-0 flex items-center justify-center">
        {activeItem.type === 'image' ? (
          <img 
            key={activeItem.id} 
            src={activeItem.url} 
            className="w-full h-full object-cover transition-opacity duration-1000"
            alt="Content"
          />
        ) : (
          <video 
            key={activeItem.id}
            src={activeItem.url}
            autoPlay
            muted
            className="w-full h-full object-cover"
          />
        )}
      </div>
      {/* Technical Debug Overlay */}
      <div className="absolute top-8 left-8 p-6 bg-black/60 backdrop-blur-md border border-white/10 text-white font-mono text-xs rounded-lg pointer-events-none space-y-3 min-w-[280px]">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="flex items-center gap-2 font-bold text-indigo-400">
            <Activity className="size-3" /> SCREENMESH OS v2.4
          </span>
          <span className="text-emerald-400 animate-pulse">● RUNNING</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 opacity-80">
          <span className="text-zinc-500">DEVICE_ID</span>
          <span className="text-right uppercase truncate">{id}</span>
          <span className="text-zinc-500">PLAYLIST</span>
          <span className="text-right truncate">{playlist.name}</span>
          <span className="text-zinc-500">MANIFEST_V</span>
          <span className="text-right">0.{playlist.version}</span>
          <span className="text-zinc-500">SYNC_STAT</span>
          <span className="text-right text-emerald-400">{syncCount} OK</span>
        </div>
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span>CONTENT_HASH</span>
            <span>{activeItem.checksum}</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / playlist.items.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 text-[9px] pt-2 text-zinc-500">
          <span className="flex items-center gap-1"><ShieldCheck className="size-2" /> SIGNATURE_OK</span>
          <span className="flex items-center gap-1"><Database className="size-2" /> CACHE_LOCAL</span>
        </div>
      </div>
      <div className="absolute bottom-8 right-8 text-white/20 font-mono text-[10px]">
        PROTOTYPE SIMULATOR // NOT FOR PRODUCTION USE
      </div>
    </div>
  );
}
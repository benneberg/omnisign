import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, CheckCircle2, ShieldAlert, Zap, Activity, Clock, Server, ShieldCheck, Database } from 'lucide-react';
import { Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Device } from '@shared/types';
import { motion } from 'framer-motion';
const TELEMETRY_DATA = [
  { time: '10:00', traffic: 120, cacheHit: 85 },
  { time: '11:00', traffic: 145, cacheHit: 88 },
  { time: '12:00', traffic: 160, cacheHit: 92 },
  { time: '13:00', traffic: 180, cacheHit: 75 },
  { time: '14:00', traffic: 170, cacheHit: 94 },
  { time: '15:00', traffic: 195, cacheHit: 91 },
  { time: '16:00', traffic: 185, cacheHit: 93 },
];
export function HomePage() {
  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api<{ items: Device[] }>('/v1/devices'),
    refetchInterval: 10000,
  });
  const devices = devicesData?.items ?? [];
  const activeCount = devices.filter(d => d.status === 'active').length;
  const watchdogAlerts = devices.filter(d => d.telemetry.escalationLevel !== 'none').length;
  const offlineCount = devices.filter(d => d.status === 'offline' || d.status === 'emergency_mode').length;
  return (
    <AppLayout container>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase tracking-[0.3em] mb-2">
              <ShieldCheck className="h-4 w-4" /> SECURE MESH VERIFIED
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter">Fleet Integrity</h1>
            <p className="text-muted-foreground text-lg font-medium">Monitoring {devices.length} nodes across high-resilience execution tiers.</p>
          </div>
          <div className="flex flex-col items-end">
            <div className="bg-emerald-500/10 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black border border-emerald-500/20 flex items-center gap-2 uppercase tracking-widest">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Mesh Sync Active
            </div>
          </div>
        </div>
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Active Nodes", value: activeCount, sub: "Heartbeat Verified", icon: CheckCircle2, color: "emerald" },
            { title: "Watchdog Esc", value: watchdogAlerts, sub: "Self-Healing Active", icon: ShieldAlert, color: "rose" },
            { title: "Offline Nodes", value: offlineCount, sub: "Emergency Protocol", icon: AlertTriangle, color: "amber" },
            { title: "Avg MTTR", value: "1.4s", sub: "Mean Recovery Time", icon: Clock, color: "indigo" },
          ].map((stat, i) => (
            <motion.div key={stat.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className={`border-l-4 shadow-soft hover:shadow-lg transition-all ${
                stat.color === 'emerald' ? 'border-l-emerald-500' :
                stat.color === 'rose' ? 'border-l-rose-500' :
                stat.color === 'amber' ? 'border-l-amber-500' : 'border-l-indigo-500'
              }`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 opacity-50" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black">{stat.value}</div>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">{stat.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-7">
          <Card className="md:col-span-4 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5 px-6 py-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                <CardTitle className="text-[10px] font-black uppercase tracking-widest">Global Telemetry Stream</CardTitle>
              </div>
              <Badge variant="outline" className="text-[9px] font-mono">BATTLE_TESTED_V3</Badge>
            </CardHeader>
            <CardContent className="h-[300px] pt-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={TELEMETRY_DATA}>
                  <defs>
                    <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4338CA" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4338CA" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCache" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" hide />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="traffic" stroke="#4338CA" fill="url(#colorTraffic)" strokeWidth={3} />
                  <Area type="monotone" dataKey="cacheHit" stroke="#10B981" fill="url(#colorCache)" strokeWidth={2} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="md:col-span-3 shadow-soft flex flex-col">
            <CardHeader className="border-b bg-muted/5 px-6 py-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                System Watchdog Feed
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative rounded-full h-2 w-2 bg-rose-600"></span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow pt-6 px-6 space-y-6">
              <div className="space-y-4">
                {devices.filter(d => d.telemetry.escalationLevel !== 'none').slice(0, 3).map(d => (
                  <div key={d.id} className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-100">
                    <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />
                    <div>
                      <div className="text-[10px] font-black text-rose-600 uppercase">{d.name}</div>
                      <div className="text-[10px] text-rose-500/80 font-mono">Watchdog Level: {d.telemetry.escalationLevel}</div>
                    </div>
                  </div>
                ))}
                {watchdogAlerts === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-30">
                    <ShieldCheck className="h-10 w-10 text-emerald-500" />
                    <p className="text-[10px] font-black uppercase">Watchdog Normal</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
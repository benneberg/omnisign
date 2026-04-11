import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, CheckCircle2, ShieldAlert, Zap, Activity, Clock, Server, ShieldCheck } from 'lucide-react';
import { Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Device } from '@shared/types';
import { motion } from 'framer-motion';
const TRAFFIC_DATA = [
  { time: '10:00', lat: 45, req: 120 },
  { time: '11:00', lat: 52, req: 145 },
  { time: '12:00', lat: 48, req: 160 },
  { time: '13:00', lat: 61, req: 180 },
  { time: '14:00', lat: 55, req: 170 },
  { time: '15:00', lat: 67, req: 195 },
  { time: '16:00', lat: 63, req: 185 },
];
export function HomePage() {
  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api<{ items: Device[] }>('/v1/devices'),
  });
  const devices = devicesData?.items ?? [];
  const activeCount = devices.filter(d => d.status === 'active').length;
  const issuesCount = devices.filter(d => d.status === 'offline' || (d.telemetry.playbackErrors?.length ?? 0) > 0).length;
  const avgUptime = devices.length ? Math.floor(devices.reduce((acc, d) => acc + d.telemetry.uptimeSeconds, 0) / devices.length / 3600) : 0;
  return (
    <AppLayout container>
      <div className="space-y-10 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase tracking-[0.3em] mb-2">
              <ShieldCheck className="h-4 w-4" /> Root Identity Verified
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-foreground">Fleet Observability</h1>
            <p className="text-muted-foreground text-lg text-pretty max-w-2xl font-medium">Orchestrating high-integrity execution nodes across the ScreenMesh network.</p>
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-end"
          >
            <div className="bg-emerald-500/10 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black border border-emerald-500/20 flex items-center gap-2 shrink-0 h-fit uppercase tracking-widest mb-1">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }} 
                transition={{ duration: 2, repeat: Infinity }}
                className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"
              />
              System Nominal
            </div>
            <span className="text-[9px] font-mono text-muted-foreground opacity-60">Control Plane Latency: 12ms</span>
          </motion.div>
        </div>
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Orchestrated Nodes", value: devices.length, sub: "Fleet Capacity", icon: Server, color: "indigo" },
            { title: "Healthy Peers", value: activeCount, sub: "Heartbeat Verified", icon: CheckCircle2, color: "emerald" },
            { title: "Anomalies Detected", value: issuesCount, sub: "Watchdog Alerts", icon: ShieldAlert, color: "rose" },
            { title: "Fleet MTBF", value: `${avgUptime}h`, sub: "Avg Uninterrupted", icon: Clock, color: "amber" },
          ].map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="group"
            >
              <Card className={`border-l-4 shadow-soft transition-all hover:shadow-lg h-full ${
                stat.color === 'indigo' ? 'border-l-indigo-600 border-indigo-100' :
                stat.color === 'emerald' ? 'border-l-emerald-600 border-emerald-100' :
                stat.color === 'rose' ? 'border-l-rose-600 border-rose-100' : 'border-l-amber-600 border-amber-100'
              }`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity ${
                    stat.color === 'indigo' ? 'text-indigo-600' :
                    stat.color === 'emerald' ? 'text-emerald-600' :
                    stat.color === 'rose' ? 'text-rose-600' : 'text-amber-600'
                  }`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</div>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tight">{stat.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-7">
          <Card className="md:col-span-4 shadow-soft border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10 px-6 py-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                <CardTitle className="text-[10px] font-black uppercase tracking-widest">Telemetry Stream</CardTitle>
              </div>
              <Badge variant="outline" className="text-[9px] font-mono font-bold">API_V1.1_STABLE</Badge>
            </CardHeader>
            <CardContent className="h-[350px] pt-8 px-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={TRAFFIC_DATA}>
                  <defs>
                    <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4338CA" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4338CA" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid #4338CA20', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}
                    cursor={{ stroke: '#4338CA', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="req" stroke="#4338CA" fillOpacity={1} fill="url(#colorReq)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="md:col-span-3 shadow-soft border-slate-200 flex flex-col">
            <CardHeader className="border-b bg-muted/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  Live System Events
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                  </span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-grow pt-6 px-6 space-y-6">
              {devices.some(d => (d.telemetry.playbackErrors?.length ?? 0) > 0) ? (
                <div className="space-y-3">
                  {devices.filter(d => (d.telemetry.playbackErrors?.length ?? 0) > 0).map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 animate-in slide-in-from-right-4">
                      <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />
                      <div>
                        <div className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{d.name}</div>
                        <div className="text-[10px] text-rose-500/80 font-mono font-bold mt-1">Watchdog: Frame Stall Detected</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 opacity-40">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Health Integrity 100%</p>
                </div>
              )}
              <div className="pt-4 border-t border-dashed border-slate-200">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-4">Real-time Ledger</h4>
                <div className="space-y-4">
                  {[
                    { id: 1, text: 'Manifest Revision Signed (v1.4.2)', time: '2m ago', type: 'info' },
                    { id: 2, text: 'New Pairing Challenge Generated', time: '12m ago', type: 'warn' },
                    { id: 3, text: 'Access Token Rotation Complete', time: '1h ago', type: 'info' },
                  ].map((feed, i) => (
                    <motion.div
                      key={feed.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + (i * 0.1) }}
                      className="flex justify-between items-start text-xs group"
                    >
                      <div className="flex gap-3">
                        <div className={`mt-1 h-1.5 w-1.5 rounded-full ${feed.type === 'warn' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                        <span className="text-slate-600 font-bold leading-tight group-hover:text-indigo-600 transition-colors">{feed.text}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground/50 font-mono font-bold tabular-nums shrink-0 ml-4">{feed.time}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
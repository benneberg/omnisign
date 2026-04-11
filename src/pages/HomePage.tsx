import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, CheckCircle2, ShieldAlert, Zap, Activity, Clock, Server } from 'lucide-react';
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
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Fleet Observability</h1>
            <p className="text-muted-foreground text-lg text-pretty max-w-2xl font-medium">Global Control Plane orchestrating high-integrity execution nodes.</p>
          </div>
          <div className="bg-emerald-500/10 text-emerald-600 px-4 py-1.5 rounded-full text-xs font-bold border border-emerald-500/20 flex items-center gap-2 shrink-0 h-fit">
            <Zap className="h-3 w-3 fill-emerald-600" /> SYSTEM_NOMINAL
          </div>
        </div>
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Orchestrated Nodes", value: devices.length, sub: "Active Fleet Capacity", icon: Server, color: "indigo" },
            { title: "Healthy Peers", value: activeCount, sub: "Heartbeat Verified", icon: CheckCircle2, color: "emerald" },
            { title: "Anomalies Detected", value: issuesCount, sub: "Watchdog Alerts", icon: ShieldAlert, color: "rose" },
            { title: "Fleet MTBF", value: `${avgUptime}h`, sub: "Avg Uninterrupted", icon: Clock, color: "amber" },
          ].map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="group"
            >
              <Card className={`border-l-4 shadow-soft transition-shadow hover:shadow-lg h-full ${
                stat.color === 'indigo' ? 'border-l-indigo-500' :
                stat.color === 'emerald' ? 'border-l-emerald-500' :
                stat.color === 'rose' ? 'border-l-rose-500' : 'border-l-amber-500'
              }`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity ${
                    stat.color === 'indigo' ? 'text-indigo-500' :
                    stat.color === 'emerald' ? 'text-emerald-500' :
                    stat.color === 'rose' ? 'text-rose-500' : 'text-amber-500'
                  }`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase font-semibold">{stat.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-7">
          <Card className="md:col-span-4 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                <CardTitle className="text-sm font-bold uppercase tracking-widest">Control Plane Traffic</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="h-[350px] pt-8">
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
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '10px' }}
                  />
                  <Area type="monotone" dataKey="req" stroke="#4338CA" fillOpacity={1} fill="url(#colorReq)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="md:col-span-3 shadow-soft flex flex-col">
            <CardHeader className="border-b bg-muted/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  Live Feed
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                </CardTitle>
                <Badge variant="outline" className="text-[9px]">REAL-TIME</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-grow pt-6 space-y-6">
              {devices.some(d => (d.telemetry.playbackErrors?.length ?? 0) > 0) ? (
                <div className="space-y-3">
                  {devices.filter(d => (d.telemetry.playbackErrors?.length ?? 0) > 0).map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 animate-in slide-in-from-right-4">
                      <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-rose-600 uppercase tracking-wide">{d.name}</div>
                        <div className="text-[10px] text-rose-500/80 font-mono">Watchdog: Content Frame Stall</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 opacity-40">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  <p className="text-xs font-bold uppercase tracking-[0.2em]">All Systems Nominal</p>
                </div>
              )}
              <div className="pt-4 border-t border-dashed">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">System Events</h4>
                {[
                  { id: 1, text: 'Manifest Signed: Revision 1.4.2', time: '2m ago' },
                  { id: 2, text: 'New Pairing Challenge: Node_X2', time: '12m ago' },
                  { id: 3, text: 'Token Rotated: ScreenMesh_Core', time: '1h ago' },
                ].map((feed, i) => (
                  <motion.div
                    key={feed.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + (i * 0.1) }}
                    className="flex justify-between items-center py-2.5 text-xs group"
                  >
                    <span className="text-muted-foreground font-medium group-hover:text-foreground transition-colors">{feed.text}</span>
                    <span className="text-[10px] text-muted-foreground/50 tabular-nums">{feed.time}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
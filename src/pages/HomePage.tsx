import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, CheckCircle2, ShieldAlert, Zap, Activity, Clock, Server } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Device } from '@shared/types';
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
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fleet Observability</h1>
            <p className="text-muted-foreground mt-1 text-pretty">Comprehensive Control Plane metrics for ScreenMesh execution nodes.</p>
          </div>
          <div className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20 flex items-center gap-2">
            <Zap className="h-3 w-3 fill-emerald-600" /> SYSTEM_NOMINAL
          </div>
        </div>
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Orchestrated Nodes</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{devices.length}</div>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase font-semibold">Active Fleet Capacity</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Healthy Peers</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">{activeCount}</div>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase font-semibold">Heartbeat Verified</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-rose-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Anomalies Detected</CardTitle>
              <ShieldAlert className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-rose-600">{issuesCount}</div>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase font-semibold">Watchdog / Integrity Alerts</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fleet MTBF</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{avgUptime}h</div>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase font-semibold">Avg Uninterrupted Uptime</p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-6 md:grid-cols-7">
          <Card className="md:col-span-4 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                <CardTitle className="text-base">Control Plane Traffic</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="h-[320px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={TRAFFIC_DATA}>
                  <defs>
                    <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '10px' }}
                  />
                  <Area type="monotone" dataKey="req" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorReq)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="md:col-span-3 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Critical System Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {devices.some(d => (d.telemetry.playbackErrors?.length ?? 0) > 0) ? (
                  devices.filter(d => (d.telemetry.playbackErrors?.length ?? 0) > 0).map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg bg-rose-500/5 border border-rose-500/20">
                      <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-rose-600">{d.name}</div>
                        <div className="text-xs text-rose-500/80 font-mono">Watchdog Triggered: Content Stall</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 opacity-40">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    <p className="text-xs font-bold uppercase tracking-widest">No Integrity Faults</p>
                  </div>
                )}
                <div className="pt-4 border-t">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Live Feed</h4>
                  {[
                    { id: 1, text: 'Manifest Signed: v1.4.2 for Lobby North', time: '2m ago' },
                    { id: 2, text: 'New Pair: Retail Display 02', time: '12m ago' },
                    { id: 3, text: 'OTA Update Pushed: 1.2.4-stable', time: '1h ago' },
                  ].map(feed => (
                    <div key={feed.id} className="flex justify-between items-center py-2 text-xs">
                      <span className="text-muted-foreground font-medium">{feed.text}</span>
                      <span className="text-[10px] text-muted-foreground/60">{feed.time}</span>
                    </div>
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
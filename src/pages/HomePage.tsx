import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, CheckCircle2, AlertCircle, Clock, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Device } from '@shared/types';
const MOCK_CHART_DATA = [
  { time: '10:00', heartbeats: 45 },
  { time: '11:00', heartbeats: 52 },
  { time: '12:00', heartbeats: 48 },
  { time: '13:00', heartbeats: 61 },
  { time: '14:00', heartbeats: 55 },
  { time: '15:00', heartbeats: 67 },
  { time: '16:00', heartbeats: 63 },
];
export function HomePage() {
  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api<{ items: Device[] }>('/api/devices'),
  });
  const devices = devicesData?.items ?? [];
  const activeCount = devices.filter(d => d.status === 'active').length;
  const offlineCount = devices.filter(d => d.status === 'offline').length;
  const pairingCount = devices.filter(d => d.status === 'pairing').length;
  return (
    <AppLayout container>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time telemetry and system health orchestration.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Devices</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{devices.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered hardware units</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Healthy</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Actively heartbeating</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Issues</CardTitle>
              <AlertCircle className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">{offlineCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Devices currently offline</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{pairingCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Pending pairing approval</p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-7">
          <Card className="md:col-span-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <CardTitle>Fleet Traffic (Heartbeats/hr)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MOCK_CHART_DATA}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                  />
                  <Line type="monotone" dataKey="heartbeats" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Recent Fleet Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { id: 1, event: 'Firmware Update', target: 'Lobby North', time: '2m ago', type: 'info' },
                  { id: 2, event: 'Offline Warning', target: 'Breakroom South', time: '1h ago', type: 'error' },
                  { id: 3, event: 'New Pairing Request', target: 'dev-9923', time: '4h ago', type: 'warn' },
                ].map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{ev.event}</p>
                      <p className="text-xs text-muted-foreground">{ev.target}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">{ev.time}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
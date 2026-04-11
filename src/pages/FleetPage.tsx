import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Monitor, RefreshCcw, Plus, Trash2, ShieldAlert, Layers, RotateCcw, Activity, Terminal, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Device, Playlist } from '@shared/types';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
export function FleetPage() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewingDevice, setViewingDevice] = useState<Device | null>(null);
  const [pairingCode, setPairingCode] = useState('');
  const { data: devicesData, isLoading, refetch } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api<{ items: Device[] }>('/v1/devices'),
  });
  const { data: playlistsData } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => api<{ items: Playlist[] }>('/v1/playlists'),
  });
  const pairMutation = useMutation({
    mutationFn: (id: string) => api(`/v1/devices/${id}/pair`, {
      method: 'POST',
      body: JSON.stringify({ code: pairingCode })
    }),
    onSuccess: () => {
      toast.success('Device successfully paired');
      setPairingCode('');
      setViewingDevice(null);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (e) => toast.error(e.message)
  });
  const bulkAssign = useMutation({
    mutationFn: (playlistId: string) => api('/v1/devices/bulk/assign', {
      method: 'POST',
      body: JSON.stringify({ deviceIds: selectedIds, playlistId })
    }),
    onSuccess: () => {
      toast.success('Playlist assigned to selected devices');
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    }
  });
  const devices = useMemo(() => {
    const list = devicesData?.items ?? [];
    if (statusFilter === 'all') return list;
    return list.filter(d => d.status === statusFilter);
  }, [devicesData, statusFilter]);
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const toggleAll = () => {
    setSelectedIds(prev => prev.length === devices.length ? [] : devices.map(d => d.id));
  };
  const chartData = useMemo(() => {
    if (!viewingDevice) return [];
    return viewingDevice.metricsHistory.cpu.map((c, i) => ({
      time: format(viewingDevice.metricsHistory.timestamps[i] || Date.now(), 'HH:mm'),
      cpu: c,
      mem: viewingDevice.metricsHistory.mem[i]
    }));
  }, [viewingDevice]);
  return (
    <AppLayout container>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fleet Orchestration</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage {devices.length} execution nodes across the mesh.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Sync
            </Button>
            <Button onClick={() => toast.info('Auto-provisioning activated')}>
              <Plus className="mr-2 h-4 w-4" /> Add Node
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
            <TabsList>
              <TabsTrigger value="all">All Nodes</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="pairing">Pairing</TabsTrigger>
              <TabsTrigger value="offline">Offline</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-12"><Checkbox checked={selectedIds.length === devices.length && devices.length > 0} onCheckedChange={toggleAll} /></TableHead>
                <TableHead>Node Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Telemetry</TableHead>
                <TableHead>Firmware</TableHead>
                <TableHead>Signal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id} className="group cursor-pointer hover:bg-muted/30" onClick={() => setViewingDevice(device)}>
                  <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedIds.includes(device.id)} onCheckedChange={() => toggleSelect(device.id)} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Monitor className={`h-4 w-4 ${device.status === 'active' ? 'text-indigo-500' : 'text-muted-foreground'}`} />
                      <div>
                        <div className="font-bold text-sm">{device.name}</div>
                        <div className="text-[10px] font-mono text-muted-foreground uppercase">{device.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${device.status === 'active' ? 'bg-emerald-500 shadow-glow' : device.status === 'offline' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`} />
                      <span className="capitalize text-xs font-medium">{device.status}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-4 text-[10px] font-medium text-muted-foreground uppercase">
                      <span>CPU {device.telemetry.cpuUsage}%</span>
                      <span>MEM {device.telemetry.memUsage}%</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">v{device.appVersion}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {device.lastHeartbeatAt > 0 ? formatDistanceToNow(device.lastHeartbeatAt, { addSuffix: true }) : 'NO_SIGNAL'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {selectedIds.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-4 glass dark:glass-dark rounded-2xl border-indigo-500/50 border shadow-2xl animate-in fade-in slide-in-from-bottom-4">
            <span className="text-sm font-bold text-indigo-500">{selectedIds.length} Nodes Selected</span>
            <div className="h-6 w-px bg-indigo-500/20" />
            <Select onValueChange={(v) => bulkAssign.mutate(v)}>
              <SelectTrigger className="w-44 h-9 bg-background/50 border-indigo-500/30">
                <Layers className="h-4 w-4 mr-2" /> <SelectValue placeholder="Assign Playlist" />
              </SelectTrigger>
              <SelectContent>
                {playlistsData?.items.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-9 hover:bg-rose-500/10 hover:text-rose-500" onClick={() => setSelectedIds([])}>Cancel</Button>
          </div>
        )}
      </div>
      <Sheet open={!!viewingDevice} onOpenChange={() => setViewingDevice(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {viewingDevice && (
            <div className="space-y-8 pt-6">
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Monitor className="h-6 w-6 text-indigo-500" />
                    <div>
                      <SheetTitle>{viewingDevice.name}</SheetTitle>
                      <SheetDescription className="font-mono text-[10px] uppercase">UID: {viewingDevice.id}</SheetDescription>
                    </div>
                  </div>
                  <a href={`/simulator/${viewingDevice.id}`} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm"><ExternalLink className="h-4 w-4" /></Button>
                  </a>
                </div>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/50 border space-y-1">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1"><Activity className="h-3 w-3" /> Real-time CPU</div>
                  <div className="text-2xl font-bold">{viewingDevice.telemetry.cpuUsage}%</div>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border space-y-1">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1"><Layers className="h-3 w-3" /> Memory Load</div>
                  <div className="text-2xl font-bold">{viewingDevice.telemetry.memUsage}%</div>
                </div>
              </div>
              <div className="h-[200px] w-full">
                <div className="text-xs font-bold mb-4 flex items-center gap-2"><Activity className="h-3 w-3 text-indigo-500" /> Performance History</div>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4338CA" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4338CA" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="cpu" stroke="#4338CA" fill="url(#colorPerf)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {viewingDevice.status === 'pairing' && (
                <div className="p-6 rounded-2xl border-amber-500/20 bg-amber-500/5 space-y-4">
                  <div className="flex items-center gap-2 text-amber-600 font-bold text-sm"><Plus className="h-4 w-4" /> Provisioning Required</div>
                  <div className="flex gap-2">
                    <Input placeholder="6-digit code" className="bg-background" value={pairingCode} onChange={(e) => setPairingCode(e.target.value)} />
                    <Button onClick={() => pairMutation.mutate(viewingDevice.id)} disabled={pairMutation.isPending}>Pair</Button>
                  </div>
                </div>
              )}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold flex items-center gap-2"><Terminal className="h-3 w-3 text-indigo-500" /> Node Event Logs</div>
                  <Badge variant="outline" className="text-[9px] uppercase">Last 50 Events</Badge>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {viewingDevice.logs.map((log) => (
                    <div key={log.id} className="flex gap-3 p-3 rounded-lg border bg-muted/20 text-[11px] font-mono leading-relaxed">
                      <div className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${log.level === 'error' ? 'bg-rose-500' : log.level === 'warn' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <div className="flex-grow">
                        <div className="flex justify-between items-center opacity-50 mb-1">
                          <span>{format(log.timestamp, 'HH:mm:ss')}</span>
                          <span className="uppercase">{log.level}</span>
                        </div>
                        <div className="font-bold text-foreground/90">{log.event}</div>
                        {log.details && <div className="mt-1 opacity-70 italic">{log.details}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
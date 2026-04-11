import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Monitor, RefreshCcw, Plus, ShieldCheck, Layers, Activity, Terminal, ExternalLink, Cpu } from 'lucide-react';
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
  const alertedAnomalies = useRef<Set<string>>(new Set());
  const { data: devicesData, isLoading, refetch } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api<{ items: Device[] }>('/v1/devices'),
    refetchInterval: 5000,
  });
  const { data: playlistsData } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => api<{ items: Playlist[] }>('/v1/playlists'),
  });
  useEffect(() => {
    if (!devicesData?.items) return;
    const anomalies = devicesData.items.filter(d => (d.telemetry.playbackErrors?.length ?? 0) > 0);
    const currentAnomalyIds = new Set(anomalies.map(d => d.id));
    anomalies.forEach(d => {
      if (!alertedAnomalies.current.has(d.id)) {
        toast.warning(`Watchdog Alert: ${d.name} reported playback stall`, {
          description: "Auto-recovery protocol initiated.",
          id: `anom-${d.id}`
        });
        alertedAnomalies.current.add(d.id);
      }
    });
    // Cleanup stale alerts from tracker if device no longer has errors
    alertedAnomalies.current.forEach(id => {
      if (!currentAnomalyIds.has(id)) {
        alertedAnomalies.current.delete(id);
      }
    });
  }, [devicesData]);
  const pairMutation = useMutation({
    mutationFn: (id: string) => api(`/v1/devices/${id}/pair`, {
      method: 'POST',
      body: JSON.stringify({ code: pairingCode })
    }),
    onSuccess: () => {
      toast.success('Device Identity Verified & Authorized');
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
      toast.success('Playlist manifest signed for selected cluster');
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    }
  });
  const devices = useMemo(() => {
    const list = devicesData?.items ?? [];
    if (statusFilter === 'all') return list;
    return list.filter(d => d.status === statusFilter);
  }, [devicesData, statusFilter]);
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
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Fleet Monitor</h1>
            <p className="text-muted-foreground mt-1 text-lg">Orchestrating {devices.length} verified execution nodes.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-12 px-6 rounded-xl border-2" onClick={() => {
              alertedAnomalies.current.clear();
              refetch();
            }} disabled={isLoading}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Sync Mesh
            </Button>
            <Button className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-primary">
              <Plus className="mr-2 h-4 w-4" /> Provision Node
            </Button>
          </div>
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
          <TabsList className="bg-muted/50 p-1 h-12 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg px-6">All Nodes</TabsTrigger>
            <TabsTrigger value="active" className="rounded-lg px-6">Active</TabsTrigger>
            <TabsTrigger value="pairing" className="rounded-lg px-6">Pairing</TabsTrigger>
            <TabsTrigger value="offline" className="rounded-lg px-6 text-rose-500">Offline</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="rounded-2xl border bg-card overflow-hidden shadow-soft border-slate-200">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 px-6">
                  <Checkbox 
                    checked={devices.length > 0 && selectedIds.length === devices.length} 
                    onCheckedChange={() => setSelectedIds(selectedIds.length === devices.length ? [] : devices.map(d => d.id))} 
                  />
                </TableHead>
                <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest">Execution Node</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-center">Security</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Real-time Load</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">HW Profile</TableHead>
                <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest text-right">Heartbeat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id} className="group cursor-pointer hover:bg-muted/20 transition-colors" onClick={() => setViewingDevice(device)}>
                  <TableCell className="px-6" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedIds.includes(device.id)} 
                      onCheckedChange={() => setSelectedIds(prev => prev.includes(device.id) ? prev.filter(i => i !== device.id) : [...prev, device.id])} 
                    />
                  </TableCell>
                  <TableCell className="px-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${device.status === 'active' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Monitor className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900">{device.name}</div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">ID_{device.id.slice(0, 12)}...</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={device.publicKey ? "default" : "outline"} className={`text-[9px] font-mono ${device.publicKey ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
                      {device.publicKey ? "ED25519_VERIFIED" : "UNTRUSTED"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5 w-32">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>CPU {device.telemetry.cpuUsage}%</span>
                        <span>MEM {device.telemetry.memUsage}%</span>
                      </div>
                      <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${device.telemetry.cpuUsage}%` }} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase">
                      <Badge variant="secondary" className="text-[9px]">{device.platform}</Badge>
                      <span className="flex items-center gap-1"><Cpu className="h-3 w-3"/> {device.telemetry.cpuCores || 4}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 text-right font-mono text-[10px] font-bold text-slate-400">
                    {device.lastHeartbeatAt > 0 ? formatDistanceToNow(device.lastHeartbeatAt, { addSuffix: true }).toUpperCase() : 'NO_SIGNAL'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {selectedIds.length > 0 && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 px-8 py-5 glass dark:glass-dark rounded-3xl border-indigo-500/50 border-2 shadow-2xl animate-in fade-in slide-in-from-bottom-8">
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">{selectedIds.length} Nodes Selected</span>
              <span className="text-[10px] text-muted-foreground uppercase font-mono">Cluster Orchestration</span>
            </div>
            <div className="h-8 w-px bg-indigo-500/20" />
            <Select onValueChange={(v) => bulkAssign.mutate(v)}>
              <SelectTrigger className="w-56 h-11 bg-background/50 border-indigo-500/30 rounded-xl font-bold">
                <Layers className="h-4 w-4 mr-2" /> <SelectValue placeholder="Assign Playlist" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {playlistsData?.items.map(p => (
                  <SelectItem key={p.id} value={p.id} className="font-bold">{p.name} (v{p.version})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-11 px-6 rounded-xl hover:bg-rose-500/10 hover:text-rose-500 font-bold" onClick={() => setSelectedIds([])}>Cancel</Button>
          </div>
        )}
      </div>
      <Sheet open={!!viewingDevice} onOpenChange={(o) => !o && setViewingDevice(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto border-l-2">
          {viewingDevice && (
            <div className="space-y-10 pt-6">
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-primary">
                      <Monitor className="h-8 w-8" />
                    </div>
                    <div>
                      <SheetTitle className="text-2xl font-black tracking-tight">{viewingDevice.name}</SheetTitle>
                      <SheetDescription className="font-mono text-[10px] uppercase font-bold tracking-widest text-indigo-500 flex items-center gap-2">
                        <ShieldCheck className="h-3 w-3" /> UID: {viewingDevice.id}
                      </SheetDescription>
                    </div>
                  </div>
                  <a href={`/simulator/${viewingDevice.id}`} target="_blank" rel="noreferrer">
                    <Button variant="outline" className="h-12 w-12 rounded-xl border-2"><ExternalLink className="h-5 w-5" /></Button>
                  </a>
                </div>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl bg-muted/30 border-2 border-slate-100 space-y-2">
                  <div className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1.5"><Activity className="h-3 w-3" /> CPU Load</div>
                  <div className="text-3xl font-black tracking-tighter">{viewingDevice.telemetry.cpuUsage}%</div>
                </div>
                <div className="p-6 rounded-2xl bg-muted/30 border-2 border-slate-100 space-y-2">
                  <div className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1.5"><Layers className="h-3 w-3" /> Mem Usage</div>
                  <div className="text-3xl font-black tracking-tighter">{viewingDevice.telemetry.memUsage}%</div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="text-xs font-black uppercase tracking-widest flex items-center gap-2 px-1"><Cpu className="h-4 w-4 text-indigo-500" /> Secure Telemetry Stream</div>
                <div className="h-[180px] w-full bg-slate-50 rounded-2xl border-2 border-slate-100 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4338CA" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#4338CA" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" hide />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="cpu" stroke="#4338CA" fill="url(#colorPerf)" strokeWidth={3} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {viewingDevice.status === 'pairing' && (
                <div className="p-8 rounded-3xl border-2 border-amber-500/30 bg-amber-500/5 space-y-6 shadow-lg shadow-amber-500/5">
                  <div className="flex items-center gap-2 text-amber-700 font-black text-sm uppercase tracking-widest">
                    <ShieldCheck className="h-5 w-5" /> Identity Provisioning Required
                  </div>
                  <div className="flex gap-3">
                    <Input 
                      placeholder="6-digit challenge code" 
                      className="h-12 bg-background font-black tracking-[0.5em] text-center text-xl rounded-xl border-2" 
                      value={pairingCode} 
                      onChange={(e) => setPairingCode(e.target.value)} 
                    />
                    <Button onClick={() => pairMutation.mutate(viewingDevice.id)} disabled={pairMutation.isPending} className="h-12 px-8 rounded-xl font-bold bg-amber-600 hover:bg-amber-700">AUTHORIZE</Button>
                  </div>
                  <p className="text-[10px] text-amber-600/70 font-bold text-center uppercase">Verified Ed25519 Public Key Handshake will follow</p>
                </div>
              )}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Terminal className="h-4 w-4 text-indigo-500" /> Event Ledger</div>
                  <Badge variant="outline" className="text-[9px] font-mono border-2">IMMUTABLE_LOG</Badge>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {viewingDevice.logs.map((log) => (
                    <div key={log.id} className="flex gap-4 p-4 rounded-xl border-2 bg-slate-50/50 text-[11px] font-mono transition-all hover:border-slate-300">
                      <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 shadow-sm ${log.level === 'error' ? 'bg-rose-500 shadow-rose-200' : log.level === 'warn' ? 'bg-amber-500 shadow-amber-200' : 'bg-emerald-500 shadow-emerald-200'}`} />
                      <div className="flex-grow space-y-1">
                        <div className="flex justify-between items-center opacity-60 font-bold uppercase tracking-tighter">
                          <span>{format(log.timestamp, 'HH:mm:ss.SSS')}</span>
                          <span className={`${log.level === 'error' ? 'text-rose-600' : log.level === 'warn' ? 'text-amber-600' : 'text-emerald-600'}`}>{log.level}</span>
                        </div>
                        <div className="font-black text-slate-800 text-xs">{log.event}</div>
                        {log.details && <div className="text-[10px] text-slate-500 leading-tight bg-white/50 p-2 rounded-lg mt-2 border border-slate-100">{log.details}</div>}
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
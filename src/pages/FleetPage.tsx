import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Monitor, RefreshCcw, Plus, ShieldCheck, Layers, Activity, Terminal, ExternalLink, Cpu, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Device, Playlist, DeviceInitResponse } from '@shared/types';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Copy } from 'lucide-react';
export function FleetPage() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewingDevice, setViewingDevice] = useState<Device | null>(null);
  const [pairingCode, setPairingCode] = useState('');
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [provisionResult, setProvisionResult] = useState<DeviceInitResponse | null>(null);
  const [platform, setPlatform] = useState('ScreenMesh-OS');
  const [appVersion, setAppVersion] = useState('3.1.0-STABLE');
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
    const anomalies = devicesData.items.filter(d => (d.telemetry.playbackErrors?.length ?? 0) > 0 || d.telemetry.escalationLevel !== 'none');
    anomalies.forEach(d => {
      if (!alertedAnomalies.current.has(d.id + d.telemetry.escalationLevel)) {
        toast.warning(`Security Alert: ${d.name}`, {
          description: `Device entered ${d.telemetry.escalationLevel} mode. Watchdog active.`,
          id: `anom-${d.id}`
        });
        alertedAnomalies.current.add(d.id + d.telemetry.escalationLevel);
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

  const provisionMutation = useMutation({
    mutationFn: async ({platform, appVersion}: {platform:string, appVersion:string}) => 
      api<DeviceInitResponse>('/v1/devices/init', {
        method:'POST', 
        body:JSON.stringify({platform, appVersion})
      }),
    onSuccess: (data) => { 
      toast.success(`Provisioned Node ${data.deviceId}`);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setProvisionResult(data); 
    },
    onError: (e: any) => toast.error(e.message)
  });
  const devices = useMemo(() => {
    const list = devicesData?.items ?? [];
    if (statusFilter === 'all') return list;
    return list.filter(d => d.status === statusFilter);
  }, [devicesData, statusFilter]);
  return (
    <AppLayout container>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Fleet Monitor</h1>
            <p className="text-muted-foreground mt-1 text-lg">Orchestrating {devices.length} verified nodes with high-fidelity resilience.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-12 px-6 rounded-xl border-2" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Sync Mesh
            </Button>
            <Button className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-primary" onClick={() => { setProvisionOpen(true); setProvisionResult(null); }}>
              <Plus className="mr-2 h-4 w-4" /> Provision Node
            </Button>
          </div>
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
          <TabsList className="bg-muted/50 p-1 h-12 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg px-6">All Nodes</TabsTrigger>
            <TabsTrigger value="active" className="rounded-lg px-6">Active</TabsTrigger>
            <TabsTrigger value="emergency_mode" className="rounded-lg px-6 text-rose-500">Emergency</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="rounded-2xl border bg-card overflow-hidden shadow-soft border-slate-200">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-12 px-6">
                  <Checkbox 
                    checked={devices.length > 0 && selectedIds.length === devices.length}
                    onCheckedChange={() => setSelectedIds(selectedIds.length === devices.length ? [] : devices.map(d => d.id))}
                  />
                </TableHead>
                <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest">Execution Node</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-center">Resilience</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Load</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Nonce Rotation</TableHead>
                <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest text-right">Heartbeat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id} className="group cursor-pointer hover:bg-muted/20" onClick={() => setViewingDevice(device)}>
                  <TableCell className="px-6" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(device.id)}
                      onCheckedChange={() => setSelectedIds(prev => prev.includes(device.id) ? prev.filter(i => i !== device.id) : [...prev, device.id])}
                    />
                  </TableCell>
                  <TableCell className="px-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${device.status === 'emergency_mode' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {device.status === 'emergency_mode' ? <AlertTriangle className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{device.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">REV_{device.appVersion}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={device.telemetry.escalationLevel === 'none' ? 'outline' : 'destructive'} className="text-[9px]">
                      {device.telemetry.escalationLevel.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${device.telemetry.cpuUsage}%` }} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-[9px] text-slate-400 truncate w-32">
                      {device.expectedNonce || 'UNINITIALIZED'}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 text-right font-mono text-[10px] font-bold text-slate-400 uppercase">
                    {device.lastHeartbeatAt > 0 ? formatDistanceToNow(device.lastHeartbeatAt, { addSuffix: true }) : 'NO_SIGNAL'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <Sheet open={provisionOpen || !!provisionResult} onOpenChange={(open) => { if (!open) setProvisionResult(null); setProvisionOpen(open); }} position='right' size='sm'>
        <SheetContent className='w-[425px]'>
          <SheetHeader>
            <SheetTitle>Provision Device Node</SheetTitle>
            <SheetDescription>Select platform & version</SheetDescription>
          </SheetHeader>
          {provisionResult ? (
            <div className="space-y-6">
              <div>
                <div className="text-sm font-mono text-muted-foreground mb-2">Device ID</div>
                <code className="bg-muted px-3 py-1 rounded-lg text-sm font-mono block">{provisionResult.deviceId}</code>
              </div>
              <div className="text-center space-y-4 pt-4 border-t">
                <div className='text-4xl font-mono font-black tracking-widest'>{provisionResult.pairingCode}</div>
                <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
                  <Badge variant="secondary">Expires {formatDistanceToNow(provisionResult.pairingExpiresAt)}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button onClick={async()=>{
                    await navigator.clipboard.writeText(provisionResult.pairingCode);
                    toast.success('Copied');
                  }} variant='outline' size="sm">
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Code
                  </Button>
                  <Button asChild size="sm">
                    <a href={`/simulator/${provisionResult.deviceId}`} target='_blank' rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Test in Simulator
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className='space-y-4 py-4'>
              <div>
                <Label className="text-sm font-medium mb-2 block">Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ScreenMesh-OS">ScreenMesh-OS</SelectItem>
                    <SelectItem value="webOS 6.x">webOS 6.x</SelectItem>
                    <SelectItem value="webOS 8.x">webOS 8.x</SelectItem>
                    <SelectItem value="Tizen">Tizen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">App Version</Label>
                <Input 
                  value={appVersion} 
                  onChange={e=>setAppVersion(e.target.value)} 
                  placeholder='3.1.0-STABLE'
                />
              </div>
              <Button 
                onClick={()=>provisionMutation.mutate({platform, appVersion})} 
                className='w-full' 
                disabled={provisionMutation.isPending}
              >
                {provisionMutation.isPending ? 'Provisioning...' : 'Provision Node'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!viewingDevice} onOpenChange={(o) => !o && setViewingDevice(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {viewingDevice && (
            <div className="space-y-8 pt-6">
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-primary">
                      <ShieldCheck className="h-8 w-8" />
                    </div>
                    <div>
                      <SheetTitle className="text-2xl font-black">{viewingDevice.name}</SheetTitle>
                      <SheetDescription className="font-mono text-[10px] uppercase text-indigo-500 font-bold">
                        Security Cluster: High-Integrity
                      </SheetDescription>
                    </div>
                  </div>
                  <a href={`/simulator/${viewingDevice.id}`} target="_blank" rel="noreferrer">
                    <Button variant="outline" className="h-10 w-10 rounded-xl"><ExternalLink className="h-4 w-4" /></Button>
                  </a>
                </div>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/30 border space-y-1">
                  <div className="text-[9px] font-black uppercase text-muted-foreground">Watchdog Status</div>
                  <div className="font-bold text-sm text-indigo-600">{viewingDevice.telemetry.escalationLevel.toUpperCase()}</div>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border space-y-1">
                  <div className="text-[9px] font-black uppercase text-muted-foreground">Sync Interval</div>
                  <div className="font-bold text-sm">{Math.round((viewingDevice.nextSyncInterval || 60000) / 1000)}s</div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-indigo-500" /> Watchdog Ledger
                </div>
                <div className="space-y-2">
                  {viewingDevice.logs.filter(l => l.event.toLowerCase().includes('watchdog') || l.event.toLowerCase().includes('integrity')).map((log) => (
                    <div key={log.id} className="p-3 rounded-lg border bg-slate-50 text-[10px] font-mono flex justify-between">
                      <span className="text-slate-600">{log.event}</span>
                      <span className="text-slate-400">{format(log.timestamp, 'HH:mm:ss')}</span>
                    </div>
                  ))}
                  {viewingDevice.logs.length === 0 && <div className="text-center py-4 text-[10px] text-muted-foreground">No critical events recorded.</div>}
                </div>
              </div>
              {viewingDevice.status === 'pairing' && (
                <div className="p-6 rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 space-y-4">
                  <div className="text-amber-700 font-black text-xs uppercase">Challenge Pending</div>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="6-digit code" 
                      className="text-center font-black tracking-widest"
                      value={pairingCode}
                      onChange={(e) => setPairingCode(e.target.value)}
                    />
                    <Button onClick={() => pairMutation.mutate(viewingDevice.id)} className="bg-amber-600">PAIR</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
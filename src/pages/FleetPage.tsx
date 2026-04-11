import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, RefreshCcw, Plus, Trash2, ShieldAlert, Layers, RotateCcw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Device, Playlist } from '@shared/types';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
export function FleetPage() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: devicesData, isLoading, refetch } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api<{ items: Device[] }>('/v1/devices'),
  });
  const { data: playlistsData } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => api<{ items: Playlist[] }>('/v1/playlists'),
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
  const bulkAction = useMutation({
    mutationFn: (type: 'reboot' | 'clear-cache') => api(`/v1/devices/bulk/${type}`, {
      method: 'POST',
      body: JSON.stringify({ deviceIds: selectedIds })
    }),
    onSuccess: (data: any) => {
      toast.info(data.message);
      setSelectedIds([]);
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
            <Button onClick={() => toast.info('Initialization flow triggered in player')}>
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
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
              <span className="text-xs font-bold mr-2 text-indigo-600">{selectedIds.length} Selected</span>
              <Select onValueChange={(v) => bulkAssign.mutate(v)}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <Layers className="h-3 w-3 mr-2" /> <SelectValue placeholder="Assign Playlist" />
                </SelectTrigger>
                <SelectContent>
                  {playlistsData?.items.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => bulkAction.mutate('reboot')}>
                <RotateCcw className="h-3 w-3 mr-2" /> Reboot
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => bulkAction.mutate('clear-cache')}>
                <Trash2 className="h-3 w-3 mr-2" /> Purge Cache
              </Button>
            </div>
          )}
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
              {devices.map((device) => {
                const isVeryOffline = device.status === 'offline' && (Date.now() - device.lastHeartbeatAt > 300000);
                return (
                  <TableRow key={device.id} className="group">
                    <TableCell><Checkbox checked={selectedIds.includes(device.id)} onCheckedChange={() => toggleSelect(device.id)} /></TableCell>
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
                        <div className={`h-2 w-2 rounded-full ${device.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : device.status === 'offline' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`} />
                        <span className="capitalize text-xs font-medium">{device.status}</span>
                        {isVeryOffline && <ShieldAlert className="h-3 w-3 text-rose-500 animate-bounce" />}
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
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
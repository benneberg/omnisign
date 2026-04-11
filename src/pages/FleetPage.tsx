import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, Monitor, ExternalLink, RefreshCcw, Plus, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Device } from '@shared/types';
import { formatDistanceToNow } from 'date-fns';
export function FleetPage() {
  const queryClient = useQueryClient();
  const [pairingOpen, setPairingOpen] = useState(false);
  const [pairCode, setPairCode] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const { data: devicesData, isLoading, refetch } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api<{ items: Device[] }>('/v1/devices'),
  });
  const pairMutation = useMutation({
    mutationFn: ({ id, code }: { id: string, code: string }) => api(`/v1/devices/${id}/pair`, {
      method: 'POST',
      body: JSON.stringify({ code })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setPairingOpen(false);
      setPairCode('');
    }
  });
  const devices = devicesData?.items ?? [];
  return (
    <AppLayout container>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fleet Monitor</h1>
            <p className="text-muted-foreground mt-1">Real-time observability and hardware orchestration.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Sync Fleet
            </Button>
            <Button onClick={() => {
              // In this prototype, we'd trigger the /init flow to get a deviceId
              api<{ deviceId: string, pairingCode: string }>('/v1/devices/init', { method: 'POST' })
                .then(res => {
                  setSelectedDeviceId(res.deviceId);
                  setPairingOpen(true);
                });
            }}>
              <Plus className="mr-2 h-4 w-4" /> Pair New Node
            </Button>
          </div>
        </div>
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Execution Node</TableHead>
                <TableHead>Health State</TableHead>
                <TableHead>Load Profile</TableHead>
                <TableHead>Firmware</TableHead>
                <TableHead>Last Heartbeat</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Monitor className="h-12 w-12 text-muted-foreground opacity-20" />
                      <div className="text-lg font-medium">No registered devices</div>
                      <p className="text-sm text-muted-foreground max-w-xs">Start by pairing a ScreenMesh player using its unique 6-digit challenge code.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {devices.map((device) => (
                <TableRow key={device.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${device.status === 'active' ? 'bg-indigo-500/10 text-indigo-600' : 'bg-muted text-muted-foreground'}`}>
                        <Monitor className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-bold">{device.name}</div>
                        <div className="text-2xs font-mono text-muted-foreground uppercase">{device.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${device.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : device.status === 'offline' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`} />
                      <span className="capitalize text-sm font-medium">{device.status}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5 w-32">
                      <div className="flex justify-between text-[10px] text-muted-foreground uppercase">
                        <span>CPU</span>
                        <span>{device.telemetry.cpuUsage}%</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${device.telemetry.cpuUsage}%` }} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-mono">v{device.appVersion}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs font-medium">
                    {device.lastHeartbeatAt > 0 ? formatDistanceToNow(device.lastHeartbeatAt, { addSuffix: true }) : 'NO_SIGNAL'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <a href={`/simulator/${device.id}`} target="_blank" className="flex items-center cursor-pointer">
                            <ExternalLink className="mr-2 h-4 w-4" /> Launch Player
                          </a>
                        </DropdownMenuItem>
                        {device.status === 'pairing' && (
                          <DropdownMenuItem onClick={() => {
                            setSelectedDeviceId(device.id);
                            setPairingOpen(true);
                          }} className="text-indigo-600 font-bold">
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Pairing
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-rose-600">
                          <ShieldAlert className="mr-2 h-4 w-4" /> Force Decommission
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Dialog open={pairingOpen} onOpenChange={setPairingOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Verify Device Challenge</DialogTitle>
              <DialogDescription>
                Enter the 6-digit pairing code displayed on the screen of device <code className="bg-muted px-1 rounded">{selectedDeviceId.slice(0, 8)}</code>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="000000"
                maxLength={6}
                value={pairCode}
                onChange={(e) => setPairCode(e.target.value)}
                className="text-center text-3xl font-bold tracking-[0.5em] h-16"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPairingOpen(false)}>Cancel</Button>
              <Button onClick={() => pairMutation.mutate({ id: selectedDeviceId, code: pairCode })} disabled={pairCode.length !== 6 || pairMutation.isPending}>
                {pairMutation.isPending ? 'Verifying...' : 'Authorize Node'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
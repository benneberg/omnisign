import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Layers, Clock, GripVertical, Trash2, Save, ArrowLeft, RefreshCw, ShieldCheck, Code } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { computeHash } from '@/lib/crypto-utils';
import type { Playlist, PlaylistItem } from '@shared/types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
function SortableItem({ item, onRemove, onChange }: { item: PlaylistItem, onRemove: () => void, onChange: (updates: Partial<PlaylistItem>) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const [isHashing, setIsHashing] = useState(false);
  const style = { transform: CSS.Transform.toString(transform), transition };
  const generateIntegrity = async () => {
    setIsHashing(true);
    try {
      const hash = await computeHash(item.url + item.durationMs);
      onChange({ integrity: hash });
      toast.success('SHA256 Content Integrity Generated');
    } finally {
      setIsHashing(false);
    }
  };
  return (
    <div ref={setNodeRef} style={style} className="flex flex-col bg-card border rounded-xl p-5 mb-4 group shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4 mb-4">
        <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground"><GripVertical className="h-5 w-5" /></div>
        <div className="h-12 w-20 bg-muted rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border-2 border-dashed font-bold text-[10px] text-muted-foreground uppercase">
          {item.type}
        </div>
        <div className="flex-grow">
          <Input placeholder="Asset Source URL" value={item.url} onChange={(e) => onChange({ url: e.target.value })} className="h-9" />
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove} className="text-rose-500 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-4 gap-4 items-end">
        <div>
          <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Content Type</Label>
          <Select value={item.type} onValueChange={(v) => onChange({ type: v as any })}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="html">HTML Fragment</SelectItem>
              <SelectItem value="url">External URL</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Duration (ms)</Label>
          <Input type="number" value={item.durationMs} onChange={(e) => onChange({ durationMs: parseInt(e.target.value) })} className="h-9" />
        </div>
        <div className="col-span-2">
          <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> SHA256 Integrity Hash
          </Label>
          <div className="flex gap-2">
            <Input value={item.integrity} readOnly className="h-9 font-mono text-[10px] bg-muted/50 truncate" />
            <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={generateIntegrity} disabled={isHashing}>
              <RefreshCw className={`h-3 w-3 ${isHashing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
      {item.type === 'html' && (
        <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-dashed">
          <Label className="text-[10px] font-bold uppercase text-muted-foreground">HTML Payload Editor</Label>
          <Textarea
            value={item.htmlContent || ''}
            onChange={(e) => onChange({ htmlContent: e.target.value })}
            className="mt-1 font-mono text-xs min-h-[120px] bg-background"
            placeholder="<div class='custom-widget'>...</div>"
          />
        </div>
      )}
    </div>
  );
}
export function PlaylistsPage() {
  const queryClient = useQueryClient();
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const { data: playlistsData } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => api<{ items: Playlist[] }>('/v1/playlists'),
  });
  const publishMutation = useMutation({
    mutationFn: (playlist: Playlist) => {
      const pending = playlist.items.some(i => i.integrity === 'pending' || !i.integrity);
      if (pending) throw new Error("All items must have a verified integrity hash before publication");
      return api(`/v1/playlists/${playlist.id}/publish`, {
        method: 'POST',
        body: JSON.stringify({ items: playlist.items })
      });
    },
    onSuccess: () => {
      toast.success('Manifest Signed & Distributed to Mesh Edge');
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setEditingPlaylist(null);
    },
    onError: (e) => toast.error(e.message)
  });
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id && editingPlaylist) {
      const oldIndex = editingPlaylist.items.findIndex(i => i.id === active.id);
      const newIndex = editingPlaylist.items.findIndex(i => i.id === over.id);
      setEditingPlaylist({ ...editingPlaylist, items: arrayMove(editingPlaylist.items, oldIndex, newIndex) });
    }
  };
  const playlists = playlistsData?.items ?? [];
  if (editingPlaylist) {
    return (
      <AppLayout container>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b pb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setEditingPlaylist(null)} className="rounded-full"><ArrowLeft className="h-4 w-4" /></Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{editingPlaylist.name}</h1>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono">REVISION_{editingPlaylist.version}</Badge> 
                  Orchestrating High-Integrity Manifest
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowRaw(!showRaw)}><Code className="h-4 w-4 mr-2"/> Raw</Button>
              <Button onClick={() => publishMutation.mutate(editingPlaylist)} disabled={publishMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 shadow-primary">
                <Save className="mr-2 h-4 w-4" /> Publish & Sign
              </Button>
            </div>
          </div>
          {showRaw && (
            <Card className="bg-slate-950 text-slate-50 font-mono text-[10px] p-4 overflow-x-auto shadow-2xl">
              <pre>{JSON.stringify(editingPlaylist, null, 2)}</pre>
            </Card>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={editingPlaylist.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {editingPlaylist.items.map((item, idx) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    onRemove={() => {
                      const newItems = [...editingPlaylist.items];
                      newItems.splice(idx, 1);
                      setEditingPlaylist({ ...editingPlaylist, items: newItems });
                    }}
                    onChange={(updates) => {
                      const newItems = [...editingPlaylist.items];
                      newItems[idx] = { ...newItems[idx], ...updates };
                      setEditingPlaylist({ ...editingPlaylist, items: newItems });
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Button variant="outline" className="w-full border-dashed border-2 py-12 bg-muted/10 hover:bg-muted/30 transition-all rounded-xl" onClick={() => {
            setEditingPlaylist({ ...editingPlaylist, items: [...editingPlaylist.items, { id: crypto.randomUUID(), type: 'image', url: '', integrity: 'pending', durationMs: 10000 }] });
          }}>
            <Plus className="mr-2 h-5 w-5 opacity-50" /> Insert Content Layer (requires signing)
          </Button>
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout container>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Content Playlists</h1>
            <p className="text-muted-foreground mt-1 text-lg">Secure manifest design for edge execution nodes.</p>
          </div>
          <Button className="bg-primary shadow-lg h-12 px-6 rounded-xl font-bold"><Plus className="mr-2 h-5 w-5" /> New Playlist</Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <Card key={playlist.id} className="group hover:ring-2 hover:ring-indigo-500/50 transition-all duration-300 shadow-soft border-slate-200 overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl font-bold">{playlist.name}</CardTitle>
                  <Badge variant="secondary" className="font-mono text-[10px]">REV_{playlist.version}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pb-4">
                <div className="flex gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <div className="flex items-center gap-1.5"><Layers className="h-3 w-3" /> {playlist.items.length} Layers</div>
                  <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {playlist.items.reduce((a, b) => a + b.durationMs, 0) / 1000}s Total</div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 p-4 border-t">
                <Button variant="ghost" size="sm" className="w-full font-bold group-hover:text-indigo-600 group-hover:bg-indigo-50/50" onClick={() => setEditingPlaylist(playlist)}>
                  Manifest Editor
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
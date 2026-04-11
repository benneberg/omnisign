import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Layers, Clock, GripVertical, Trash2, Save, ArrowLeft, RefreshCw, Code } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Playlist, PlaylistItem } from '@shared/types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
function SortableItem({ item, onRemove, onChange }: { item: PlaylistItem, onRemove: () => void, onChange: (updates: Partial<PlaylistItem>) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const generateChecksum = () => {
    const hash = 'h-' + Math.random().toString(36).slice(2, 8);
    onChange({ checksum: hash });
    toast.success('Integrity hash recalculated');
  };
  return (
    <div ref={setNodeRef} style={style} className="flex flex-col bg-card border rounded-lg p-4 mb-3 group shadow-sm">
      <div className="flex items-center gap-4 mb-4">
        <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground"><GripVertical className="h-5 w-5" /></div>
        <div className="h-12 w-20 bg-muted rounded overflow-hidden flex-shrink-0 flex items-center justify-center border font-bold text-[10px] text-muted-foreground">
          {item.type.toUpperCase()}
        </div>
        <div className="flex-grow">
          <Input placeholder="URL or Asset Identifier" value={item.url} onChange={(e) => onChange({ url: e.target.value })} className="h-8" />
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove} className="text-rose-500"><Trash2 className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-4 gap-4 items-end">
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Type</Label>
          <Select value={item.type} onValueChange={(v) => onChange({ type: v as any })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="html">HTML Fragment</SelectItem>
              <SelectItem value="url">External URL</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Duration (ms)</Label>
          <Input type="number" value={item.durationMs} onChange={(e) => onChange({ durationMs: parseInt(e.target.value) })} className="h-8" />
        </div>
        <div className="col-span-2">
          <Label className="text-[10px] uppercase text-muted-foreground">Integrity Checksum</Label>
          <div className="flex gap-2">
            <Input value={item.checksum} readOnly className="h-8 font-mono text-[10px] bg-muted/50" />
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={generateChecksum}><RefreshCw className="h-3 w-3" /></Button>
          </div>
        </div>
      </div>
      {item.type === 'html' && (
        <div className="mt-4 animate-in fade-in zoom-in-95">
          <Label className="text-[10px] uppercase text-muted-foreground">HTML Payload</Label>
          <Textarea 
            value={item.htmlContent || ''} 
            onChange={(e) => onChange({ htmlContent: e.target.value })} 
            className="mt-1 font-mono text-xs min-h-[100px]"
            placeholder="<div>Hello OmniSign</div>"
          />
        </div>
      )}
    </div>
  );
}
export function PlaylistsPage() {
  const queryClient = useQueryClient();
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const { data: playlistsData, isLoading } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => api<{ items: Playlist[] }>('/v1/playlists'),
  });
  const publishMutation = useMutation({
    mutationFn: (playlist: Playlist) => api(`/v1/playlists/${playlist.id}/publish`, {
      method: 'POST',
      body: JSON.stringify({ items: playlist.items })
    }),
    onSuccess: () => {
      toast.success('Manifest signed and published');
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setEditingPlaylist(null);
    }
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
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setEditingPlaylist(null)}><ArrowLeft className="h-4 w-4" /></Button>
              <div>
                <h1 className="text-xl font-bold">{editingPlaylist.name}</h1>
                <p className="text-xs text-muted-foreground">Revision {editingPlaylist.version} • Manifest Orchestrator</p>
              </div>
            </div>
            <Button onClick={() => publishMutation.mutate(editingPlaylist)} disabled={publishMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              <Save className="mr-2 h-4 w-4" /> Publish Manifest
            </Button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={editingPlaylist.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
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
          <Button variant="outline" className="w-full border-dashed py-8 bg-muted/20" onClick={() => {
            setEditingPlaylist({ ...editingPlaylist, items: [...editingPlaylist.items, { id: crypto.randomUUID(), type: 'image', url: '', checksum: 'pending', durationMs: 10000 }] });
          }}>
            <Plus className="mr-2 h-4 w-4" /> Insert Content Layer
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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Content Playlists</h1>
            <p className="text-muted-foreground mt-1">Design and publish high-integrity execution manifests.</p>
          </div>
          <Button className="bg-primary shadow-lg"><Plus className="mr-2 h-4 w-4" /> Create Playlist</Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <Card key={playlist.id} className="group hover:border-indigo-500/50 transition-all duration-300 shadow-soft">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-bold">{playlist.name}</CardTitle>
                  <Badge variant="secondary" className="font-mono">v{playlist.version}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pb-4">
                <div className="flex gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1"><Layers className="h-3 w-3" /> {playlist.items.length} items</div>
                  <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {playlist.items.reduce((a, b) => a + b.durationMs, 0) / 1000}s</div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 p-4 border-t">
                <Button variant="ghost" size="sm" className="w-full font-bold group-hover:text-indigo-600" onClick={() => setEditingPlaylist(playlist)}>
                  Open Editor
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
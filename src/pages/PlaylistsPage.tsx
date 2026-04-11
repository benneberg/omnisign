import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlayCircle, Plus, Layers, Clock, GripVertical, Trash2, Save, ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Playlist, PlaylistItem } from '@shared/types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
function SortableItem({ item, onRemove, onChange }: { item: PlaylistItem, onRemove: () => void, onChange: (updates: Partial<PlaylistItem>) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-4 bg-card border rounded-lg p-4 mb-2 group">
      <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="h-12 w-16 bg-muted rounded overflow-hidden flex-shrink-0">
        {item.type === 'image' ? (
          <img src={item.url} className="h-full w-full object-cover" alt="" />
        ) : (
          <div className="h-full w-full bg-indigo-500 flex items-center justify-center text-white text-[10px]">VIDEO</div>
        )}
      </div>
      <div className="flex-grow grid grid-cols-2 gap-4">
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Duration (ms)</Label>
          <Input 
            type="number" 
            value={item.durationMs} 
            onChange={(e) => onChange({ durationMs: parseInt(e.target.value) })}
            className="h-8"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Transition</Label>
          <Select value={item.transition || 'cut'} onValueChange={(v) => onChange({ transition: v as any })}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cut">Cut</SelectItem>
              <SelectItem value="fade">Fade</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onRemove} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 className="h-4 w-4" />
      </Button>
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
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setEditingPlaylist(null);
    }
  });
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id && editingPlaylist) {
      const oldIndex = editingPlaylist.items.findIndex(i => i.id === active.id);
      const newIndex = editingPlaylist.items.findIndex(i => i.id === over.id);
      setEditingPlaylist({
        ...editingPlaylist,
        items: arrayMove(editingPlaylist.items, oldIndex, newIndex)
      });
    }
  };
  const playlists = playlistsData?.items ?? [];
  if (editingPlaylist) {
    return (
      <AppLayout container>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setEditingPlaylist(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet
            </Button>
            <Button onClick={() => publishMutation.mutate(editingPlaylist)} disabled={publishMutation.isPending}>
              <Save className="mr-2 h-4 w-4" /> Save & Publish
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{editingPlaylist.name}</h1>
            <p className="text-muted-foreground">Orchestrate sequence, duration, and transition logic.</p>
          </div>
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
          <Button variant="outline" className="w-full border-dashed" onClick={() => {
            const newItem: PlaylistItem = {
              id: crypto.randomUUID(),
              type: 'image',
              url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200',
              durationMs: 5000,
              checksum: 'h' + Math.random().toString(16).slice(2, 6)
            };
            setEditingPlaylist({ ...editingPlaylist, items: [...editingPlaylist.items, newItem] });
          }}>
            <Plus className="mr-2 h-4 w-4" /> Add Media Element
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
            <h1 className="text-3xl font-bold tracking-tight">Content Playlists</h1>
            <p className="text-muted-foreground mt-1">Design and schedule execution manifests.</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Playlist
          </Button>
        </div>
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active Playlists</TabsTrigger>
            <TabsTrigger value="drafts">Drafts & Templates</TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {playlists.map((playlist) => (
                  <Card key={playlist.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg font-bold">{playlist.name}</CardTitle>
                        <Badge variant="secondary">v{playlist.version}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-4">
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1"><Layers className="h-3 w-3" /> {playlist.items.length} items</div>
                        <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {playlist.items.reduce((a, b) => a + b.durationMs, 0) / 1000}s</div>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-muted/50 p-4 pt-4">
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => setEditingPlaylist(playlist)}>
                        Edit Sequence
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
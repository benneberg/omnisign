import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Plus, Layers, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Playlist } from '@shared/types';
export function PlaylistsPage() {
  const { data: playlistsData, isLoading } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => api<{ items: Playlist[] }>('/api/playlists'),
  });
  const playlists = playlistsData?.items ?? [];
  const formatTotalDuration = (pl: Playlist) => {
    const totalMs = pl.items.reduce((acc, item) => acc + item.durationMs, 0);
    const secs = Math.floor(totalMs / 1000);
    const mins = Math.floor(secs / 60);
    return mins > 0 ? `${mins}m ${secs % 60}s` : `${secs}s`;
  };
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
                    <div className="flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {playlist.items.length} items
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTotalDuration(playlist)}
                    </div>
                  </div>
                  <div className="flex -space-x-2 overflow-hidden">
                    {playlist.items.slice(0, 4).map((item) => (
                      <div key={item.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-muted overflow-hidden">
                        {item.type === 'image' ? (
                          <img src={item.url} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-indigo-500 flex items-center justify-center">
                            <PlayCircle className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                    {playlist.items.length > 4 && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs ring-2 ring-background">
                        +{playlist.items.length - 4}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/50 p-4 pt-4">
                  <Button variant="ghost" size="sm" className="w-full text-xs uppercase tracking-wider font-semibold">
                    Edit Sequence
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
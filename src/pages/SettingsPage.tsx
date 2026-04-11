import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Key, FileText, Settings2, Database, ExternalLink, Globe } from 'lucide-react';
import { ROOT_PUB_KEY } from '@shared/mock-data';
export function SettingsPage(): JSX.Element {
  return (
    <AppLayout container>
      <div className="max-w-7xl mx-auto space-y-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Control Plane Settings</h1>
          <p className="text-muted-foreground mt-1 text-lg">Global organization configuration and cryptographic auditing.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-soft border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-500" />
                <CardTitle>Organization Identity</CardTitle>
              </div>
              <CardDescription>Cryptographic credentials for manifest signing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Org Identifier</Label>
                <div className="flex gap-2">
                  <Input value="default" readOnly className="bg-muted/50 font-mono" />
                  <Badge variant="outline">SYSTEM_ROOT</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Root Public Key (ED25519)</Label>
                <div className="p-3 bg-slate-950 text-slate-400 font-mono text-[10px] rounded-xl border border-white/10 break-all leading-relaxed">
                  {ROOT_PUB_KEY}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-indigo-500" />
                <CardTitle>Fleet Defaults</CardTitle>
              </div>
              <CardDescription>Global orchestration and watchdog parameters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Heartbeat Interval</Label>
                  <div className="flex items-center gap-2">
                    <Input value="30" type="number" className="h-9" readOnly />
                    <span className="text-xs text-muted-foreground">sec</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Watchdog Jitter</Label>
                  <div className="flex items-center gap-2">
                    <Input value="5" type="number" className="h-9" readOnly />
                    <span className="text-xs text-muted-foreground">sec</span>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase">
                  <Database className="h-3 w-3" /> State Resilience
                </div>
                <p className="text-[10px] text-indigo-600/80 leading-relaxed">
                  Automatic session rotation is enabled. Nodes will automatically attempt re-pairing if challenge tokens expire during heartbeat.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="md:col-span-2 shadow-soft border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                <CardTitle>Documentation Hub</CardTitle>
              </div>
              <CardDescription>Integration guides and technical specifications.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: "API Spec v1.1", desc: "Detailed orchestration endpoint reference.", icon: Globe },
                  { title: "Mesh Protocol", desc: "Challenge-response security workflow.", icon: Key },
                  { title: "Platform Targets", desc: "WebOS & Tizen implementation guides.", icon: ExternalLink },
                ].map((doc) => (
                  <div key={doc.title} className="p-4 rounded-xl border-2 border-slate-50 hover:border-indigo-100 hover:bg-indigo-50/20 transition-all group cursor-pointer">
                    <doc.icon className="h-5 w-5 text-slate-400 group-hover:text-indigo-500 mb-3" />
                    <h4 className="text-sm font-bold text-slate-900">{doc.title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-1">{doc.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex items-center justify-between pt-10 border-t border-dashed">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">
            Build Version: v1.2.4-stable // Environment: Production Mesh
          </div>
          <Button variant="ghost" className="text-rose-500 hover:bg-rose-50 font-bold text-xs uppercase tracking-widest">
            Purge Fleet Cache
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
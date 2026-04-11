import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
export function SettingsPage(): JSX.Element {
  return (
    <AppLayout container>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Account, preferences, and system configuration.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <p className="text-sm text-muted-foreground">Manage your account settings, organization details, and personal preferences.</p>
              <Button variant="outline" className="w-full">Edit Profile</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <p className="text-sm text-muted-foreground">Coming soon...</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>API Tokens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <p className="text-sm text-muted-foreground">Generate API keys for ScreenMesh device provisioning and third-party integrations.</p>
              <Button variant="outline" className="w-full">Manage Tokens</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
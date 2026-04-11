import React from "react";
import { LayoutDashboard, Monitor, PlayCircle, Settings, ExternalLink, Terminal } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarSeparator,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
export function AppSidebar(): JSX.Element {
  const location = useLocation();
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Terminal className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-none">OmniSign</span>
            <span className="text-xs text-muted-foreground mt-1">CMS Control Plane</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Fleet Orchestration</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === "/"}>
                <Link to="/"><LayoutDashboard className="size-4" /> <span>Dashboard</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === "/fleet"}>
                <Link to="/fleet"><Monitor className="size-4" /> <span>Fleet Monitor</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === "/playlists"}>
                <Link to="/playlists"><PlayCircle className="size-4" /> <span>Playlists</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Utilities</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/settings"><Settings className="size-4" /> <span>Settings</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="text-indigo-600 dark:text-indigo-400 font-medium">
                <a href="/simulator/dev-001" target="_blank">
                  <ExternalLink className="size-4" /> <span>Launch Simulator</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-4 py-3">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs font-medium">v1.2.4-stable</p>
            <p className="text-[10px] text-muted-foreground">Connected to ScreenMesh Cloud</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
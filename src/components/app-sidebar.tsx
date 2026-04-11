import React from "react";
import { LayoutDashboard, Monitor, PlayCircle, Settings, ExternalLink, Terminal, BookOpen, FileCode, Server } from "lucide-react";
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-glow">
            <Terminal className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-none tracking-tight">OmniSign</span>
            <span className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-tighter">Control Plane v1.2</span>
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
          <SidebarGroupLabel>Documentation</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a href="https://github.com/omnisign/docs" target="_blank" rel="noreferrer">
                  <FileCode className="size-4" /> <span>API Reference</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/settings">
                  <BookOpen className="size-4" /> <span>Mesh Guide</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Utilities</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === "/settings"}>
                <Link to="/settings"><Settings className="size-4" /> <span>Settings</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
                <a href="/simulator/dev-001" target="_blank">
                  <ExternalLink className="size-4" /> <span>Lobby Simulator</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-4 py-3">
          <div className="rounded-xl bg-muted/50 p-3 border border-slate-200/50">
            <div className="flex items-center gap-2 mb-1">
              <Server className="size-3 text-indigo-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Simulation Engine</p>
            </div>
            <p className="text-[9px] text-muted-foreground font-medium leading-relaxed">
              Target: WebOS 6.x/8.x<br />
              Mode: High-Integrity
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
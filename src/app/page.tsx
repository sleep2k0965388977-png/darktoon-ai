"use client";

import React, { useEffect } from "react";
import {
  AudioWaveform,
  Clapperboard,
  Film,
  FolderKanban,
  FolderPlus,
  LayoutDashboard,
  Settings,
  Users,
  X,
} from "lucide-react";
import { StudioView, useDarktoonStore } from "@/stores/useDarktoonStore";
import {
  CreateProjectView,
  DashboardView,
} from "@/components/storyboard/DashboardAndCreateViews";
import { AudioAnalysisView } from "@/components/audio/AudioAnalysisView";
import { StoryboardEditorView } from "@/components/storyboard/StoryboardEditorView";
import { CharacterLibraryView } from "@/components/characters/CharacterLibraryView";
import {
  AssetLibraryView,
  RenderExportCenterView,
  SettingsAndProvidersView,
} from "@/components/render/ExportAndSettingsViews";

export default function DarktoonStudioPage() {
  const {
    activeView,
    activeProject,
    scenes,
    characters,
    assets,
    notification,
    setActiveView,
    clearNotification,
    fetchInitialDashboard,
  } = useDarktoonStore();

  useEffect(() => {
    fetchInitialDashboard();
  }, [fetchInitialDashboard]);

  const navItems: Array<{
    id: StudioView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }> = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "new_project", label: "New Project", icon: FolderPlus },
    { id: "audio_analysis", label: "Audio & Transcript", icon: AudioWaveform },
    {
      id: "storyboard",
      label: "Storyboard Editor",
      icon: Clapperboard,
      badge: scenes.length || undefined,
    },
    {
      id: "characters",
      label: "Characters (2D Rig)",
      icon: Users,
      badge: characters.length || undefined,
    },
    {
      id: "assets",
      label: "Assets",
      icon: FolderKanban,
      badge: assets.length || undefined,
    },
    { id: "render", label: "Render & Export MP4", icon: Film },
    { id: "settings", label: "Providers & Settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0B0D] text-[#F5F5F5]">
      {/* Studio Top Bar */}
      <header className="sticky top-0 z-40 flex h-[58px] items-center justify-between border-b border-[#292930] bg-[#111114] px-4">
        <div className="flex items-center gap-3">
          <div
            onClick={() => setActiveView("dashboard")}
            className="flex cursor-pointer items-center gap-2.5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F04444] font-mono text-sm font-black text-white shadow">
              DT
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-[#F5F5F5]">
                  DARKTOON AI
                </span>
                <span className="rounded bg-[#18181D] px-1.5 py-0.5 font-mono text-[9px] text-[#92929B] border border-[#292930]">
                  2D STUDIO
                </span>
              </div>
              <div className="text-[10px] text-[#92929B] truncate max-w-[220px]">
                {activeProject ? activeProject.name : "No Project Selected"}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? "bg-[#F04444] text-white shadow"
                    : "text-[#92929B] hover:bg-[#18181D] hover:text-[#F5F5F5]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] ${
                      isActive
                        ? "bg-black/30 text-white"
                        : "bg-[#18181D] text-[#92929B]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Active Project Status Pill */}
        <div className="flex items-center gap-2 text-xs">
          {activeProject && (
            <span className="rounded border border-[#292930] bg-[#18181D] px-2.5 py-1 font-mono text-[11px] text-[#92929B]">
              {activeProject.aspect_ratio} · {activeProject.resolution} ·{" "}
              <strong className="text-[#F5F5F5]">{activeProject.status}</strong>
            </span>
          )}
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 text-xs font-medium shadow-2xl ${
            notification.type === "error"
              ? "border-[#F04444] bg-[#18181D] text-[#F04444]"
              : notification.type === "warning"
              ? "border-[#F59E0B] bg-[#18181D] text-[#F59E0B]"
              : "border-[#22C55E] bg-[#18181D] text-[#22C55E]"
          }`}
        >
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={clearNotification}
            className="text-[#92929B] hover:text-[#F5F5F5] cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main View Content */}
      <main className="flex-1">
        {activeView === "dashboard" && <DashboardView />}
        {activeView === "new_project" && <CreateProjectView />}
        {activeView === "audio_analysis" && <AudioAnalysisView />}
        {activeView === "storyboard" && <StoryboardEditorView />}
        {activeView === "characters" && <CharacterLibraryView />}
        {activeView === "assets" && <AssetLibraryView />}
        {activeView === "render" && <RenderExportCenterView />}
        {activeView === "settings" && <SettingsAndProvidersView />}
      </main>
    </div>
  );
}

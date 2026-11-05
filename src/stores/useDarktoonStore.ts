"use client";

import { create } from "zustand";
import {
  AssetRecord,
  AudioAsset,
  CharacterProfile,
  CostRecord,
  GenerationJob,
  Project,
  ProviderStatusInfo,
  QualityControlReport,
  RenderJob,
  SceneRecord,
  Speaker,
  TimelineTrack,
  Transcript,
} from "@/types/darktoon";

export type StudioView =
  | "dashboard"
  | "new_project"
  | "audio_analysis"
  | "storyboard"
  | "characters"
  | "assets"
  | "render"
  | "settings";

export interface ProjectSummaryItem extends Project {
  scene_count: number;
  approved_scene_count: number;
  audio_duration: number;
  total_cost_usd: number;
}

interface DarktoonStudioState {
  activeView: StudioView;
  projects: ProjectSummaryItem[];
  activeProject: Project | null;
  audio: AudioAsset | null;
  transcript: Transcript | null;
  speakers: Speaker[];
  characters: CharacterProfile[];
  scenes: SceneRecord[];
  timeline: TimelineTrack[];
  assets: AssetRecord[];
  jobs: GenerationJob[];
  latestRender: RenderJob | null;
  costs: {
    total_estimated_usd: number;
    total_actual_usd: number;
    records: CostRecord[];
  };
  qualityReport: QualityControlReport | null;
  providerStatuses: ProviderStatusInfo[];
  providerDefaults: Record<string, unknown>;
  selectedSceneId: string | null;
  currentTime: number;
  isPlaying: boolean;
  isLoading: boolean;
  busyAction: string | null;
  notification: { type: "success" | "error" | "warning"; message: string } | null;

  setActiveView: (view: StudioView) => void;
  setSelectedSceneId: (sceneId: string | null, jumpToStart?: boolean) => void;
  setCurrentTime: (sec: number) => void;
  setIsPlaying: (playing: boolean) => void;
  clearNotification: () => void;
  notify: (type: "success" | "error" | "warning", message: string) => void;

  fetchInitialDashboard: () => Promise<void>;
  loadProjectWorkspace: (projectId: string, targetView?: StudioView) => Promise<void>;
  fetchProvidersStatus: () => Promise<void>;
}

export const useDarktoonStore = create<DarktoonStudioState>((set, get) => ({
  activeView: "dashboard",
  projects: [],
  activeProject: null,
  audio: null,
  transcript: null,
  speakers: [],
  characters: [],
  scenes: [],
  timeline: [],
  assets: [],
  jobs: [],
  latestRender: null,
  costs: { total_estimated_usd: 0, total_actual_usd: 0, records: [] },
  qualityReport: null,
  providerStatuses: [],
  providerDefaults: {},
  selectedSceneId: null,
  currentTime: 0,
  isPlaying: false,
  isLoading: false,
  busyAction: null,
  notification: null,

  setActiveView: (view) => set({ activeView: view, isPlaying: false }),

  setSelectedSceneId: (sceneId, jumpToStart = false) => {
    const { scenes } = get();
    const target = scenes.find((s) => s.id === sceneId);
    if (jumpToStart && target) {
      set({ selectedSceneId: sceneId, currentTime: target.start_time });
    } else {
      set({ selectedSceneId: sceneId });
    }
  },

  setCurrentTime: (sec) => {
    const { scenes, selectedSceneId } = get();
    const matchingScene = scenes.find(
      (s) => sec >= s.start_time && sec <= s.end_time
    );
    if (matchingScene && matchingScene.id !== selectedSceneId) {
      set({ currentTime: sec, selectedSceneId: matchingScene.id });
    } else {
      set({ currentTime: sec });
    }
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  clearNotification: () => set({ notification: null }),

  notify: (type, message) => {
    set({ notification: { type, message } });
    setTimeout(() => {
      if (get().notification?.message === message) {
        set({ notification: null });
      }
    }, 6000);
  },

  fetchProvidersStatus: async () => {
    const res = await fetch("/api/v1/providers");
    if (res.ok) {
      const data = await res.json();
      set({
        providerStatuses: data.providers || [],
        providerDefaults: data.active_defaults || {},
      });
    }
  },

  fetchInitialDashboard: async () => {
    set({ isLoading: true });
    try {
      const [projRes, provRes] = await Promise.all([
        fetch("/api/v1/projects"),
        fetch("/api/v1/providers"),
      ]);
      const projData = await projRes.json();
      const provData = await provRes.json();
      const projects: ProjectSummaryItem[] = projData.projects || [];

      set({
        projects,
        providerStatuses: provData.providers || [],
        providerDefaults: provData.active_defaults || {},
      });

      if (projects.length > 0 && !get().activeProject) {
        await get().loadProjectWorkspace(projects[0].id);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  loadProjectWorkspace: async (projectId, targetView) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/v1/projects/${projectId}`);
      if (!res.ok) throw new Error("Không thể tải dữ liệu dự án.");
      const data = await res.json();
      const scenes: SceneRecord[] = data.scenes || [];
      const currentSelected = get().selectedSceneId;
      const validSelected =
        scenes.find((s) => s.id === currentSelected)?.id ||
        scenes[0]?.id ||
        null;

      set({
        activeProject: data.project,
        audio: data.audio,
        transcript: data.transcript,
        speakers: data.speakers || [],
        characters: data.characters || [],
        scenes,
        timeline: data.timeline || [],
        assets: data.assets || [],
        jobs: data.jobs || [],
        latestRender: data.latest_render || null,
        costs: data.costs || {
          total_estimated_usd: 0,
          total_actual_usd: 0,
          records: [],
        },
        qualityReport: data.quality_report || null,
        selectedSceneId: validSelected,
        ...(targetView ? { activeView: targetView } : {}),
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));

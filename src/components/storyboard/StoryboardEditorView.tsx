"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Film,
  Layers,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  UserCheck,
} from "lucide-react";
import {
  ALL_ACTIONS,
  ALL_EXPRESSIONS,
  AnimationMethod,
  BackgroundPresetId,
  CameraMovement,
  CameraShot,
  CharacterAction,
  CharacterExpression,
  SceneProp,
  SceneRecord,
} from "@/types/darktoon";
import { BACKGROUND_PRESETS } from "@/backend/animations/presets";
import { DarktoonStageCanvas } from "@/components/animation/DarktoonStageCanvas";
import { MultiTrackTimeline } from "@/components/timeline/MultiTrackTimeline";
import { useDarktoonStore } from "@/stores/useDarktoonStore";

const PROP_TYPES: SceneProp["type"][] = [
  "sofa",
  "smartphone",
  "window",
  "desk",
  "lamp",
  "coffee_cup",
  "street_lamp",
  "bench",
  "door",
  "bed",
  "rain",
  "clock",
  "mirror",
];

export const StoryboardEditorView: React.FC = () => {
  const {
    activeProject,
    audio,
    scenes,
    characters,
    timeline,
    selectedSceneId,
    currentTime,
    isPlaying,
    setSelectedSceneId,
    setCurrentTime,
    setIsPlaying,
    loadProjectWorkspace,
    notify,
  } = useDarktoonStore();

  const [busySceneAction, setBusySceneAction] = useState<string | null>(null);
  const [providerChoice, setProviderChoice] = useState<
    "auto" | "mock" | "openai" | "gemini"
  >("mock");

  const activeScene: SceneRecord | undefined = useMemo(
    () =>
      scenes.find((s) => s.id === selectedSceneId) ||
      scenes.find(
        (s) => currentTime >= s.start_time && currentTime <= s.end_time
      ) ||
      scenes[0],
    [scenes, selectedSceneId, currentTime]
  );

  const charById = useMemo(
    () => new Map(characters.map((c) => [c.id, c])),
    [characters]
  );

  if (!activeProject) {
    return (
      <div className="p-8 text-center text-[#92929B]">
        Chưa chọn dự án. Hãy chọn hoặc tạo dự án từ Dashboard.
      </div>
    );
  }

  const handlePatchScene = async (
    sceneId: string,
    payload: Record<string, unknown>,
    toastMsg?: string
  ) => {
    setBusySceneAction("saving");
    try {
      const res = await fetch(`/api/v1/scenes/${sceneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Không thể cập nhật cảnh.");
      }
      await loadProjectWorkspace(activeProject.id);
      if (toastMsg) notify("success", toastMsg);
    } catch (err) {
      notify("error", err instanceof Error ? err.message : String(err));
    } finally {
      setBusySceneAction(null);
    }
  };

  const handleRegenerateImage = async (scene: SceneRecord) => {
    setBusySceneAction("regen_image");
    try {
      const res = await fetch(`/api/v1/scenes/${scene.id}/regenerate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: scene.image_prompt,
          provider: providerChoice === "auto" ? undefined : providerChoice,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Không thể tạo lại hình ảnh.");
      }
      await loadProjectWorkspace(activeProject.id);
      notify(
        "success",
        `Đã tạo lại hình ảnh Scene #${scene.sequence_index} (Asset Version v${data.newAsset?.version}).`
      );
    } catch (err) {
      notify("error", err instanceof Error ? err.message : String(err));
    } finally {
      setBusySceneAction(null);
    }
  };

  const handleRegenerateAnimation = async (scene: SceneRecord) => {
    setBusySceneAction("regen_anim");
    try {
      const res = await fetch(
        `/api/v1/scenes/${scene.id}/regenerate-animation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: scene.animation_method,
            motion_prompt: scene.motion_prompt,
            provider: providerChoice === "auto" ? undefined : providerChoice,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error?.message || "Không thể tạo lại chuyển động."
        );
      }
      await loadProjectWorkspace(activeProject.id);
      notify(
        "success",
        `Đã cập nhật chuyển động (${data.scene?.animation_method}) cho Scene #${scene.sequence_index}.`
      );
    } catch (err) {
      notify("error", err instanceof Error ? err.message : String(err));
    } finally {
      setBusySceneAction(null);
    }
  };

  const handleTrackUpdate = async (
    trackId: string,
    updates: { muted?: boolean; volume?: number }
  ) => {
    await fetch(`/api/v1/projects/${activeProject.id}/timeline`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track_id: trackId, ...updates }),
    });
    await loadProjectWorkspace(activeProject.id);
  };

  const timeInActiveScene = activeScene
    ? Math.max(0, currentTime - activeScene.start_time)
    : 0;

  const activeStageCharacters = (activeScene?.characters || [])
    .map((scChar) => {
      const profile = charById.get(scChar.character_id) || characters[0];
      return {
        profile,
        action: scChar.action,
        expression: scChar.expression,
        position: scChar.position,
      };
    })
    .filter((c) => Boolean(c.profile));

  const currentSceneIdx = scenes.findIndex((s) => s.id === activeScene?.id);

  return (
    <div className="flex h-[calc(100vh-58px)] flex-col bg-[#0B0B0D]">
      {/* 3-Column Main Studio Area */}
      <div className="grid flex-1 grid-cols-12 overflow-hidden">
        {/* LEFT COLUMN: Scene List (3 cols) */}
        <div className="col-span-3 flex flex-col border-r border-[#292930] bg-[#111114] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#292930] px-3.5 py-2.5">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#F5F5F5]">
                Storyboard Scenes ({scenes.length})
              </h2>
              <p className="text-[11px] text-[#92929B]">
                Chia theo ý nghĩa câu chuyện
              </p>
            </div>
            <select
              value={providerChoice}
              onChange={(e) =>
                setProviderChoice(
                  e.target.value as "auto" | "mock" | "openai" | "gemini"
                )
              }
              className="rounded border border-[#292930] bg-[#18181D] px-2 py-1 text-[11px] text-[#F5F5F5]"
              title="Chọn AI Provider khi Regenerate"
            >
              <option value="mock">Dev Mock ([MOCK])</option>
              <option value="auto">Default Configured</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
            {scenes.map((sc) => {
              const isSelected = sc.id === activeScene?.id;
              const dur = (sc.end_time - sc.start_time).toFixed(1);
              const thumbChars = sc.characters
                .map((c) => ({
                  profile: charById.get(c.character_id) || characters[0],
                  action: c.action,
                  expression: c.expression,
                  position: c.position,
                }))
                .filter((x) => Boolean(x.profile));

              return (
                <div
                  key={sc.id}
                  onClick={() => setSelectedSceneId(sc.id, true)}
                  className={`cursor-pointer rounded-lg border p-2.5 transition ${
                    isSelected
                      ? "border-[#F04444] bg-[#18181D] shadow-md"
                      : "border-[#292930] bg-[#0B0B0D]/70 hover:border-[#3E3E4A]"
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-[#F5F5F5]">
                      SCENE {String(sc.sequence_index).padStart(2, "0")}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {sc.is_mock && (
                        <span className="rounded bg-[#F59E0B]/15 px-1.5 py-0.5 font-mono text-[9px] text-[#F59E0B]">
                          [MOCK]
                        </span>
                      )}
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          sc.status === "APPROVED"
                            ? "bg-[#22C55E]/20 text-[#22C55E]"
                            : sc.status === "NEEDS_REVIEW" ||
                              sc.status === "FAILED"
                            ? "bg-[#F59E0B]/20 text-[#F59E0B]"
                            : "bg-[#38BDF8]/15 text-[#38BDF8]"
                        }`}
                      >
                        {sc.status}
                      </span>
                    </div>
                  </div>

                  {/* Mini Live 2D Stage Thumbnail */}
                  <div className="mb-2">
                    <DarktoonStageCanvas
                      aspectRatio="16:9"
                      backgroundId={sc.background.asset_id}
                      characters={thumbChars}
                      props={sc.props}
                      cameraShot={sc.camera_direction.shot}
                      cameraMovement={sc.camera_direction.movement}
                      timeInSceneSec={1.0}
                      compact
                    />
                  </div>

                  <p className="line-clamp-2 text-xs text-[#F5F5F5] mb-1.5">
                    &ldquo;{sc.transcript_text}&rdquo;
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-[#92929B]">
                    <span>
                      {sc.start_time.toFixed(1)}s – {sc.end_time.toFixed(1)}s (
                      {dur}s)
                    </span>
                    <span className="uppercase font-mono text-[10px] text-[#F5F5F5] bg-[#111114] px-1.5 py-0.5 rounded border border-[#292930]">
                      {sc.emotion.primary} · {sc.animation_method}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER COLUMN: Interactive 2D Rig & Scene Preview Canvas (5 cols) */}
        <div className="col-span-5 flex flex-col border-r border-[#292930] bg-[#0B0B0D] p-4 overflow-y-auto">
          {activeScene ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#F04444] px-2 py-0.5 font-mono text-xs font-bold text-white">
                      SCENE {String(activeScene.sequence_index).padStart(2, "0")}
                    </span>
                    <h3 className="text-sm font-semibold text-[#F5F5F5] truncate max-w-md">
                      {activeScene.narrative_purpose}
                    </h3>
                  </div>
                  <p className="mt-0.5 text-xs text-[#92929B]">
                    Bối cảnh:{" "}
                    {BACKGROUND_PRESETS[activeScene.background.asset_id]?.name ||
                      activeScene.background.asset_id}{" "}
                    · Asset v{activeScene.primary_asset?.version || 1}
                  </p>
                </div>

                {/* Quick Review Action Buttons (Mandatory Step 9) */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handlePatchScene(
                        activeScene.id,
                        { status: "APPROVED" },
                        `Đã duyệt (APPROVED) Scene #${activeScene.sequence_index}`
                      )
                    }
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                      activeScene.status === "APPROVED"
                        ? "bg-[#22C55E] text-black font-semibold"
                        : "border border-[#22C55E]/60 bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/20"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {activeScene.status === "APPROVED"
                      ? "Đã duyệt"
                      : "Duyệt cảnh"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handlePatchScene(
                        activeScene.id,
                        { status: "NEEDS_REVIEW" },
                        `Đã đánh dấu NEEDS_REVIEW cho Scene #${activeScene.sequence_index}`
                      )
                    }
                    className="flex items-center gap-1 rounded-md border border-[#F59E0B]/50 bg-[#F59E0B]/10 px-2.5 py-1.5 text-xs text-[#F59E0B] hover:bg-[#F59E0B]/20 cursor-pointer"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Cần sửa
                  </button>
                </div>
              </div>

              {/* Center Stage Canvas */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <DarktoonStageCanvas
                  aspectRatio={activeProject.aspect_ratio}
                  backgroundId={activeScene.background.asset_id}
                  characters={activeStageCharacters}
                  props={activeScene.props}
                  cameraShot={activeScene.camera_direction.shot}
                  cameraMovement={activeScene.camera_direction.movement}
                  subtitleText={activeScene.transcript_text}
                  timeInSceneSec={timeInActiveScene}
                  isPlaying={isPlaying}
                  isMock={activeScene.is_mock}
                  animationMethod={activeScene.animation_method}
                />
              </div>

              {/* Playback Transport Bar */}
              <div className="mt-3 flex items-center justify-between rounded-lg border border-[#292930] bg-[#18181D] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentSceneIdx <= 0}
                    onClick={() => {
                      if (currentSceneIdx > 0) {
                        setSelectedSceneId(
                          scenes[currentSceneIdx - 1].id,
                          true
                        );
                      }
                    }}
                    className="rounded border border-[#292930] bg-[#111114] p-1.5 text-[#F5F5F5] disabled:opacity-40 cursor-pointer"
                    title="Cảnh trước"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex items-center gap-1.5 rounded-md bg-[#F04444] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#dc3535] cursor-pointer"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-3.5 w-3.5" /> Tạm dừng
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" /> Phát Preview
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={currentSceneIdx >= scenes.length - 1}
                    onClick={() => {
                      if (currentSceneIdx < scenes.length - 1) {
                        setSelectedSceneId(
                          scenes[currentSceneIdx + 1].id,
                          true
                        );
                      }
                    }}
                    className="rounded border border-[#292930] bg-[#111114] p-1.5 text-[#F5F5F5] disabled:opacity-40 cursor-pointer"
                    title="Cảnh tiếp theo"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="font-mono text-xs text-[#92929B]">
                  Playhead:{" "}
                  <span className="text-[#F5F5F5] font-semibold">
                    {currentTime.toFixed(1)}s
                  </span>{" "}
                  / {(audio?.duration || 24).toFixed(1)}s
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busySceneAction !== null}
                    onClick={() => handleRegenerateImage(activeScene)}
                    className="flex items-center gap-1 rounded border border-[#292930] bg-[#111114] px-2.5 py-1.5 text-xs text-[#F5F5F5] hover:border-[#F04444] cursor-pointer"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${
                        busySceneAction === "regen_image" ? "animate-spin" : ""
                      }`}
                    />
                    Tạo lại Ảnh
                  </button>
                  <button
                    type="button"
                    disabled={busySceneAction !== null}
                    onClick={() => handleRegenerateAnimation(activeScene)}
                    className="flex items-center gap-1 rounded border border-[#292930] bg-[#111114] px-2.5 py-1.5 text-xs text-[#F5F5F5] hover:border-[#F04444] cursor-pointer"
                  >
                    <Sparkles
                      className={`h-3.5 w-3.5 text-[#F04444] ${
                        busySceneAction === "regen_anim" ? "animate-spin" : ""
                      }`}
                    />
                    Tạo lại Animation
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-[#92929B]">
              Chưa có phân cảnh nào trong Storyboard.
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Scene Properties Inspector (4 cols) */}
        <div className="col-span-4 flex flex-col bg-[#18181D] overflow-y-auto p-4 space-y-4">
          {activeScene && (
            <>
              <div className="flex items-center justify-between border-b border-[#292930] pb-2.5">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F5F5F5]">
                    Scene Properties & AI Override
                  </h3>
                  <p className="text-[11px] text-[#92929B]">
                    Chỉnh sửa riêng cảnh này mà không cần render lại toàn bộ
                  </p>
                </div>
                <span className="rounded bg-[#111114] px-2 py-0.5 font-mono text-[11px] text-[#92929B] border border-[#292930]">
                  v{activeScene.version}
                </span>
              </div>

              {/* 1. Transcript & Timing */}
              <div className="space-y-2 rounded-lg border border-[#292930] bg-[#111114] p-3">
                <div className="flex items-center justify-between text-xs font-medium text-[#F5F5F5]">
                  <span>Lời thoại & Thời lượng (Audio Sync)</span>
                  <span className="font-mono text-[11px] text-[#92929B]">
                    {activeScene.start_time.toFixed(1)}s →{" "}
                    {activeScene.end_time.toFixed(1)}s
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={activeScene.transcript_text}
                  onChange={(e) =>
                    handlePatchScene(activeScene.id, {
                      transcript_text: e.target.value,
                    })
                  }
                  className="w-full rounded border border-[#292930] bg-[#0B0B0D] p-2 text-xs text-[#F5F5F5] focus:border-[#F04444] focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#92929B]">
                      Bắt đầu (giây)
                    </label>
                    <input
                      type="number"
                      step={0.5}
                      value={activeScene.start_time}
                      onChange={(e) =>
                        handlePatchScene(activeScene.id, {
                          start_time: Number(e.target.value),
                        })
                      }
                      className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-2 py-1 text-xs text-[#F5F5F5]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#92929B]">
                      Kết thúc (giây)
                    </label>
                    <input
                      type="number"
                      step={0.5}
                      value={activeScene.end_time}
                      onChange={(e) =>
                        handlePatchScene(activeScene.id, {
                          end_time: Number(e.target.value),
                        })
                      }
                      className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-2 py-1 text-xs text-[#F5F5F5]"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Character Action, Expression & Position */}
              <div className="space-y-2.5 rounded-lg border border-[#292930] bg-[#111114] p-3">
                <div className="flex items-center justify-between text-xs font-medium text-[#F5F5F5]">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-[#F04444]" />
                    Nhân vật, Hành động (17) & Biểu cảm (10)
                  </span>
                </div>

                {activeScene.characters.map((scChar, idx) => (
                  <div
                    key={scChar.id || idx}
                    className="space-y-2 rounded border border-[#292930] bg-[#18181D] p-2.5"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-[#92929B]">
                          Nhân vật (Character ID)
                        </label>
                        <select
                          value={scChar.character_id}
                          onChange={(e) => {
                            const updatedChars = [...activeScene.characters];
                            updatedChars[idx] = {
                              ...scChar,
                              character_id: e.target.value,
                            };
                            handlePatchScene(
                              activeScene.id,
                              { characters: updatedChars },
                              "Đã đổi nhân vật trong cảnh"
                            );
                          }}
                          className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-2 py-1 text-xs text-[#F5F5F5]"
                        >
                          {characters.map((ch) => (
                            <option key={ch.id} value={ch.id}>
                              {ch.name} {ch.locked ? "🔒" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-[#92929B]">
                          Vị trí khung hình
                        </label>
                        <select
                          value={scChar.position}
                          onChange={(e) => {
                            const updatedChars = [...activeScene.characters];
                            updatedChars[idx] = {
                              ...scChar,
                              position: e.target
                                .value as typeof scChar.position,
                            };
                            handlePatchScene(activeScene.id, {
                              characters: updatedChars,
                            });
                          }}
                          className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-2 py-1 text-xs text-[#F5F5F5]"
                        >
                          <option value="left">Trái (Left)</option>
                          <option value="center">Giữa (Center)</option>
                          <option value="right">Phải (Right)</option>
                          <option value="foreground">Tiền cảnh (Foreground)</option>
                          <option value="background">Hậu cảnh (Background)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-[#92929B]">
                          Hành động (Action)
                        </label>
                        <select
                          value={scChar.action}
                          onChange={(e) => {
                            const updatedChars = [...activeScene.characters];
                            updatedChars[idx] = {
                              ...scChar,
                              action: e.target.value as CharacterAction,
                            };
                            handlePatchScene(
                              activeScene.id,
                              { characters: updatedChars },
                              `Đã đổi hành động sang '${e.target.value}'`
                            );
                          }}
                          className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-2 py-1 text-xs text-[#F5F5F5]"
                        >
                          {ALL_ACTIONS.map((act) => (
                            <option key={act} value={act}>
                              {act}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-[#92929B]">
                          Biểu cảm (Expression)
                        </label>
                        <select
                          value={scChar.expression}
                          onChange={(e) => {
                            const updatedChars = [...activeScene.characters];
                            const nextExp = e.target
                              .value as CharacterExpression;
                            updatedChars[idx] = {
                              ...scChar,
                              expression: nextExp,
                            };
                            handlePatchScene(
                              activeScene.id,
                              {
                                characters: updatedChars,
                                emotion: {
                                  ...activeScene.emotion,
                                  primary: nextExp,
                                },
                              },
                              `Đã đổi biểu cảm sang '${nextExp}'`
                            );
                          }}
                          className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-2 py-1 text-xs text-[#F5F5F5]"
                        >
                          {ALL_EXPRESSIONS.map((exp) => (
                            <option key={exp} value={exp}>
                              {exp}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 3. Background Preset & Props */}
              <div className="space-y-2 rounded-lg border border-[#292930] bg-[#111114] p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#F5F5F5]">
                  <Layers className="h-3.5 w-3.5 text-[#F04444]" />
                  Bối cảnh (Reusable Background ID) & Đạo cụ
                </div>
                <select
                  value={activeScene.background.asset_id}
                  onChange={(e) => {
                    const bgId = e.target.value as BackgroundPresetId;
                    const preset = BACKGROUND_PRESETS[bgId];
                    handlePatchScene(
                      activeScene.id,
                      {
                        background: {
                          asset_id: bgId,
                          description: preset?.description || "",
                        },
                      },
                      `Đã chuyển bối cảnh sang ${preset?.name}`
                    );
                  }}
                  className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-2 py-1.5 text-xs text-[#F5F5F5]"
                >
                  {Object.values(BACKGROUND_PRESETS).map((bg) => (
                    <option key={bg.id} value={bg.id}>
                      {bg.name} ({bg.id})
                    </option>
                  ))}
                </select>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PROP_TYPES.map((propType) => {
                    const hasProp = activeScene.props.some(
                      (p) => p.type === propType
                    );
                    return (
                      <button
                        key={propType}
                        type="button"
                        onClick={() => {
                          const nextProps = hasProp
                            ? activeScene.props.filter(
                                (p) => p.type !== propType
                              )
                            : [
                                ...activeScene.props,
                                { type: propType, position: "center" as const },
                              ];
                          handlePatchScene(activeScene.id, {
                            props: nextProps,
                          });
                        }}
                        className={`rounded px-2 py-0.5 text-[10px] border cursor-pointer ${
                          hasProp
                            ? "border-[#F04444] bg-[#F04444]/20 text-[#F5F5F5]"
                            : "border-[#292930] bg-[#0B0B0D] text-[#92929B]"
                        }`}
                      >
                        {propType}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Camera & Hybrid Animation Decision Engine */}
              <div className="space-y-2 rounded-lg border border-[#292930] bg-[#111114] p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#F5F5F5]">
                  <Camera className="h-3.5 w-3.5 text-[#F04444]" />
                  Camera & Hybrid Animation Router
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#92929B]">
                      Cỡ cảnh (Shot)
                    </label>
                    <select
                      value={activeScene.camera_direction.shot}
                      onChange={(e) =>
                        handlePatchScene(activeScene.id, {
                          camera_direction: {
                            ...activeScene.camera_direction,
                            shot: e.target.value as CameraShot,
                          },
                        })
                      }
                      className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-2 py-1 text-xs text-[#F5F5F5]"
                    >
                      <option value="wide">Wide Shot</option>
                      <option value="medium">Medium Shot</option>
                      <option value="close_up">Close-Up</option>
                      <option value="extreme_close_up">Extreme Close-Up</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#92929B]">
                      Chuyển động máy
                    </label>
                    <select
                      value={activeScene.camera_direction.movement}
                      onChange={(e) =>
                        handlePatchScene(activeScene.id, {
                          camera_direction: {
                            ...activeScene.camera_direction,
                            movement: e.target.value as CameraMovement,
                          },
                        })
                      }
                      className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-2 py-1 text-xs text-[#F5F5F5]"
                    >
                      <option value="slow_push_in">Slow Push-In</option>
                      <option value="slow_pull_out">Slow Pull-Out</option>
                      <option value="pan_left">Pan Left</option>
                      <option value="pan_right">Pan Right</option>
                      <option value="subtle_drift">Subtle Drift</option>
                      <option value="static">Static</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#92929B]">
                      Phương pháp
                    </label>
                    <select
                      value={activeScene.animation_method}
                      onChange={(e) =>
                        handlePatchScene(
                          activeScene.id,
                          {
                            animation_method: e.target
                              .value as AnimationMethod,
                          },
                          `Đã chuyển sang ${e.target.value}`
                        )
                      }
                      className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-2 py-1 text-xs text-[#F5F5F5]"
                    >
                      <option value="RIG_2D">RIG_2D (Ưu tiên)</option>
                      <option value="AI_VIDEO">AI_VIDEO (Hybrid)</option>
                      <option value="STATIC_MOTION">STATIC_MOTION</option>
                    </select>
                  </div>
                </div>

                <div className="rounded bg-[#0B0B0D] p-2 text-[11px] text-[#92929B] border border-[#292930]">
                  <span className="font-semibold text-[#F5F5F5]">
                    Lý do chọn của AI Director:{" "}
                  </span>
                  {activeScene.animation_reason}
                </div>
              </div>

              {/* 5. Prompts (Image, Motion, Negative) */}
              <div className="space-y-2 rounded-lg border border-[#292930] bg-[#111114] p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#F5F5F5]">
                  <Film className="h-3.5 w-3.5 text-[#F04444]" />
                  Visual & Motion Prompts
                </div>
                <div>
                  <label className="block text-[10px] text-[#92929B]">
                    Image Prompt
                  </label>
                  <textarea
                    rows={2}
                    value={activeScene.image_prompt}
                    onChange={(e) =>
                      handlePatchScene(activeScene.id, {
                        image_prompt: e.target.value,
                      })
                    }
                    className="w-full rounded border border-[#292930] bg-[#0B0B0D] p-1.5 text-[11px] text-[#F5F5F5]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#92929B]">
                    Motion Prompt
                  </label>
                  <textarea
                    rows={2}
                    value={activeScene.motion_prompt}
                    onChange={(e) =>
                      handlePatchScene(activeScene.id, {
                        motion_prompt: e.target.value,
                      })
                    }
                    className="w-full rounded border border-[#292930] bg-[#0B0B0D] p-1.5 text-[11px] text-[#F5F5F5]"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* BOTTOM DOCK: 6-Track Synchronized Timeline */}
      <MultiTrackTimeline
        tracks={timeline}
        scenes={scenes}
        duration={audio?.duration || 24}
        currentTime={currentTime}
        selectedSceneId={activeScene?.id || null}
        onSelectScene={(sceneId, jump) => setSelectedSceneId(sceneId, jump)}
        onSeek={(sec) => setCurrentTime(sec)}
        onToggleTrackMute={(trackId, muted) =>
          handleTrackUpdate(trackId, { muted })
        }
        onChangeTrackVolume={(trackId, volume) =>
          handleTrackUpdate(trackId, { volume })
        }
      />
    </div>
  );
};

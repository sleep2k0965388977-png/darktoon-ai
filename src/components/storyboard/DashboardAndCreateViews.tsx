"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  AudioWaveform,
  CheckCircle2,
  Clapperboard,
  Film,
  FolderPlus,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AnimationStyleId, AspectRatio, Resolution } from "@/types/darktoon";
import { useDarktoonStore } from "@/stores/useDarktoonStore";

// ============================================================================
// 1. DASHBOARD VIEW
// ============================================================================
export const DashboardView: React.FC = () => {
  const {
    projects,
    activeProject,
    providerStatuses,
    setActiveView,
    loadProjectWorkspace,
    fetchInitialDashboard,
    notify,
  } = useDarktoonStore();

  const unconfiguredCount = providerStatuses.filter(
    (p) => p.status === "NOT_CONFIGURED"
  ).length;

  const handleDeleteProject = async (
    e: React.MouseEvent,
    projectId: string,
    name: string
  ) => {
    e.stopPropagation();
    const res = await fetch(`/api/v1/projects/${projectId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await fetchInitialDashboard();
      notify("success", `Đã xóa dự án '${name}'.`);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      {/* Hero Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#292930] bg-gradient-to-r from-[#18181D] to-[#111114] p-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#F04444] px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
              STUDIO v1.0
            </span>
            <span className="text-xs text-[#92929B]">
              Dark Minimalist 2D Storytelling · Hybrid 2D Rigging + AI Video
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#F5F5F5]">
            DARKTOON AI — Audio to Animated Storytelling
          </h1>
          <p className="max-w-2xl text-xs text-[#92929B]">
            Tải audio hội thoại lên → AI hiểu nội dung & cảm xúc → Tự viết Storyboard → Khóa thiết kế nhân vật 8 bộ phận → Tạo chuyển động Hybrid 2D → Duyệt từng cảnh → Xuất MP4.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveView("new_project")}
            className="flex items-center gap-2 rounded-md bg-[#F04444] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#dc3535] transition cursor-pointer shadow-lg"
          >
            <Plus className="h-4 w-4" /> Create New Project
          </button>
          {activeProject && (
            <button
              type="button"
              onClick={() => setActiveView("storyboard")}
              className="flex items-center gap-2 rounded-md border border-[#292930] bg-[#111114] px-4 py-2.5 text-xs font-semibold text-[#F5F5F5] hover:border-[#F04444] cursor-pointer"
            >
              <Clapperboard className="h-4 w-4 text-[#F04444]" />
              Mở Storyboard hiện tại
            </button>
          )}
        </div>
      </div>

      {/* Transparent Provider Status Alert (Mandatory PRD Rule) */}
      {unconfiguredCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-4 py-3 text-xs">
          <div className="flex items-center gap-2.5 text-[#F59E0B]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              <strong>Thông báo kết nối AI Provider:</strong> Hiện có{" "}
              {unconfiguredCount} khả năng AI đang ở trạng thái{" "}
              <code className="font-mono font-bold">NOT_CONFIGURED</code> (chưa gắn API key). Hệ thống không giả lập kết quả AI thật; bạn có thể gắn API key thật trong{" "}
              <strong>Settings</strong> hoặc dùng chế độ{" "}
              <code className="font-mono font-bold">[MOCK] Development Mode</code>{" "}
              có gắn nhãn minh bạch để kiểm thử toàn bộ luồng.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveView("settings")}
            className="shrink-0 rounded border border-[#F59E0B]/50 bg-[#18181D] px-3 py-1 font-medium text-[#F5F5F5] hover:border-[#F59E0B] cursor-pointer"
          >
            Cấu hình Provider →
          </button>
        </div>
      )}

      {/* Recent Projects Grid */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5]">
            Dự án gần đây ({projects.length})
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {projects.map((proj) => {
            const isCurrent = proj.id === activeProject?.id;
            return (
              <div
                key={proj.id}
                onClick={() => loadProjectWorkspace(proj.id, "storyboard")}
                className={`group cursor-pointer rounded-xl border p-4 transition ${
                  isCurrent
                    ? "border-[#F04444] bg-[#18181D]"
                    : "border-[#292930] bg-[#18181D]/70 hover:border-[#3E3E4A]"
                }`}
              >
                {/* Minimalist Dark Thumbnail Preview */}
                <div className="relative mb-3 flex h-32 items-center justify-center overflow-hidden rounded-lg border border-[#292930] bg-[#0B0B0D]">
                  <div className="flex flex-col items-center">
                    <div className="h-7 w-7 rounded-full bg-[#F4F1EA] border-2 border-white mb-1" />
                    <div className="h-9 w-5 rounded-full bg-[#F4F1EA]" />
                  </div>
                  <span className="absolute top-2 left-2 rounded bg-[#111114]/90 px-2 py-0.5 font-mono text-[10px] text-[#F5F5F5] border border-[#292930]">
                    {proj.aspect_ratio} · {proj.resolution}
                  </span>
                  <span
                    className={`absolute top-2 right-2 rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${
                      proj.status === "COMPLETED"
                        ? "bg-[#22C55E]/20 text-[#22C55E]"
                        : proj.status === "READY_FOR_REVIEW"
                        ? "bg-[#38BDF8]/20 text-[#38BDF8]"
                        : "bg-[#F59E0B]/20 text-[#F59E0B]"
                    }`}
                  >
                    {proj.status}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#F5F5F5] group-hover:text-[#F04444] transition">
                    {proj.name}
                  </h3>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteProject(e, proj.id, proj.name)}
                    className="rounded p-1 text-[#92929B] hover:text-[#F04444] cursor-pointer"
                    title="Xóa dự án"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <p className="mt-1 line-clamp-2 text-xs text-[#92929B]">
                  {proj.description || "Không có mô tả"}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-[#292930] pt-2.5 text-[11px] text-[#92929B]">
                  <span className="flex items-center gap-1">
                    <Film className="h-3.5 w-3.5 text-[#F04444]" />
                    {proj.scene_count} cảnh ({proj.approved_scene_count} đã duyệt)
                  </span>
                  <span className="flex items-center gap-1">
                    <AudioWaveform className="h-3.5 w-3.5 text-[#22C55E]" />
                    {proj.audio_duration}s
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. CREATE NEW PROJECT VIEW
// ============================================================================
export const CreateProjectView: React.FC = () => {
  const { loadProjectWorkspace, fetchInitialDashboard, notify } =
    useDarktoonStore();

  const [name, setName] = useState("Câu Chuyện Đêm Muộn #02");
  const [description, setDescription] = useState(
    "Hội thoại tâm sự về những áp lực vô hình và khoảnh khắc tìm lại sự bình yên."
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [resolution, setResolution] = useState<Resolution>("1080p");
  const [styleId, setStyleId] = useState<AnimationStyleId>(
    "DARK_MINIMALIST_2D"
  );
  const [language, setLanguage] = useState("vi");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [autoRunMockPipeline, setAutoRunMockPipeline] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      // 1. Create Project
      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          aspect_ratio: aspectRatio,
          resolution,
          style_id: styleId,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Lỗi tạo dự án.");
      const projectId = data.project.id;

      // 2. Upload Audio file or synthesize conversation WAV
      if (audioFile) {
        const formData = new FormData();
        formData.append("file", audioFile);
        await fetch(`/api/v1/projects/${projectId}/audio/upload`, {
          method: "POST",
          body: formData,
        });
      } else {
        await fetch(`/api/v1/projects/${projectId}/audio/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_name: "dialogue_master.wav",
            duration: 24,
          }),
        });
      }

      // 3. Optionally run initial ASR + Storyboard pipeline in [MOCK] mode
      if (autoRunMockPipeline) {
        await fetch(`/api/v1/projects/${projectId}/audio/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "mock" }),
        });
        await fetch(`/api/v1/projects/${projectId}/storyboard/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "mock" }),
        });
      }

      await fetchInitialDashboard();
      await loadProjectWorkspace(
        projectId,
        autoRunMockPipeline ? "storyboard" : "audio_analysis"
      );
      notify(
        "success",
        `Đã khởi tạo dự án '${name}' ${
          autoRunMockPipeline ? "và tạo sẵn Storyboard!" : "thành công!"
        }`
      );
    } catch (err) {
      notify("error", err instanceof Error ? err.message : String(err));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-[#292930] bg-[#18181D] p-6 space-y-5"
      >
        <div className="border-b border-[#292930] pb-3">
          <h1 className="text-lg font-bold text-[#F5F5F5] flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-[#F04444]" />
            Create New Project (PRD Bước 1 & 2)
          </h1>
          <p className="text-xs text-[#92929B]">
            Thiết lập tỷ lệ khung hình, độ phân giải, phong cách Dark Minimalist 2D và tải lên file Audio gốc.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#F5F5F5] mb-1">
              Tên dự án *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F04444] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#F5F5F5] mb-1">
              Mô tả nội dung (không bắt buộc)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F04444] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#F5F5F5] mb-1">
                Định dạng tỷ lệ video (Aspect Ratio)
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-3 py-2 text-xs text-[#F5F5F5]"
              >
                <option value="16:9">16:9 — YouTube / Landscape</option>
                <option value="9:16">9:16 — TikTok / Shorts</option>
                <option value="1:1">1:1 — Social Media</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#F5F5F5] mb-1">
                Độ phân giải (Resolution)
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as Resolution)}
                className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-3 py-2 text-xs text-[#F5F5F5]"
              >
                <option value="1080p">1080p (Full HD)</option>
                <option value="720p">720p (HD)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#F5F5F5] mb-1">
                Phong cách hình ảnh (Visual Style)
              </label>
              <select
                value={styleId}
                onChange={(e) =>
                  setStyleId(e.target.value as AnimationStyleId)
                }
                className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-3 py-2 text-xs text-[#F5F5F5]"
              >
                <option value="DARK_MINIMALIST_2D">
                  DARK MINIMALIST 2D STORYTELLING (Mặc định)
                </option>
                <option value="CHARCOAL_NOIR_2D">CHARCOAL NOIR 2D</option>
                <option value="CRIMSON_VOID_2D">CRIMSON PSYCHOLOGICAL 2D</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#F5F5F5] mb-1">
                Ngôn ngữ Audio
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-3 py-2 text-xs text-[#F5F5F5]"
              >
                <option value="vi">Tiếng Việt (vi)</option>
                <option value="en">English (en)</option>
              </select>
            </div>
          </div>

          {/* Audio Upload */}
          <div>
            <label className="block text-xs font-medium text-[#F5F5F5] mb-1">
              Upload Audio hội thoại (MP3, WAV, M4A, AAC, FLAC) — Để trống để dùng file WAV hội thoại mẫu
            </label>
            <input
              type="file"
              accept=".mp3,.wav,.m4a,.aac,.flac,audio/*"
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
              className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-3 py-2 text-xs text-[#92929B]"
            />
          </div>

          <label className="flex items-center gap-2 pt-1 text-xs text-[#F5F5F5] cursor-pointer">
            <input
              type="checkbox"
              checked={autoRunMockPipeline}
              onChange={(e) => setAutoRunMockPipeline(e.target.checked)}
              className="accent-[#F04444]"
            />
            <span>
              Tự động phân tích Audio & sinh Storyboard nháp bằng{" "}
              <code className="font-mono text-[#F59E0B]">[MOCK]</code> ngay sau khi tạo dự án
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#292930] pt-4">
          <button
            type="submit"
            disabled={isCreating}
            className="flex items-center gap-2 rounded-md bg-[#F04444] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#dc3535] disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            {isCreating ? "Đang khởi tạo dự án..." : "Create Project & Start Pipeline"}
          </button>
        </div>
      </form>
    </div>
  );
};

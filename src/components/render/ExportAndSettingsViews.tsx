"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Download,
  Film,
  FolderKanban,
  KeyRound,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
} from "lucide-react";
import { AspectRatio, Resolution } from "@/types/darktoon";
import { useDarktoonStore } from "@/stores/useDarktoonStore";

// ============================================================================
// 1. RENDER & EXPORT CENTER VIEW
// ============================================================================
export const RenderExportCenterView: React.FC = () => {
  const {
    activeProject,
    scenes,
    latestRender,
    qualityReport,
    costs,
    loadProjectWorkspace,
    notify,
  } = useDarktoonStore();

  const [isRendering, setIsRendering] = useState(false);

  if (!activeProject) {
    return (
      <div className="p-8 text-center text-[#92929B]">
        Vui lòng chọn dự án từ Dashboard.
      </div>
    );
  }

  const handleStartRender = async (force: boolean = false) => {
    setIsRendering(true);
    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Lỗi khi chạy Render MP4.");
      }
      await loadProjectWorkspace(activeProject.id);
      if (data.render_job?.status === "COMPLETED") {
        notify(
          "success",
          "Đã Render thành công file video MP4 (H.264 + AAC) đồng bộ với Audio gốc!"
        );
      } else {
        notify(
          "warning",
          data.render_job?.error_message || "Render dừng do lỗi Quality Control."
        );
      }
    } catch (err) {
      notify("error", err instanceof Error ? err.message : String(err));
    } finally {
      setIsRendering(false);
    }
  };

  const handleApproveAllScenes = async () => {
    setIsRendering(true);
    try {
      for (const sc of scenes) {
        await fetch(`/api/v1/scenes/${sc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "APPROVED" }),
        });
      }
      await loadProjectWorkspace(activeProject.id);
      notify("success", `Đã duyệt toàn bộ ${scenes.length} cảnh (APPROVED).`);
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#292930] pb-4">
        <div>
          <h1 className="text-lg font-bold text-[#F5F5F5] flex items-center gap-2">
            <Film className="h-5 w-5 text-[#F04444]" />
            Render, Quality Control & MP4 Export Center
          </h1>
          <p className="text-xs text-[#92929B]">
            Kiểm tra chất lượng tự động (PRD 6.9), kiểm soát ngân sách (Cost Control) và xuất video H.264 MP4 với Audio gốc.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isRendering}
            onClick={handleApproveAllScenes}
            className="rounded-md border border-[#22C55E]/50 bg-[#22C55E]/10 px-3.5 py-2 text-xs font-semibold text-[#22C55E] hover:bg-[#22C55E]/20 cursor-pointer"
          >
            Duyệt tất cả cảnh ({scenes.length})
          </button>

          <button
            type="button"
            disabled={isRendering}
            onClick={() => handleStartRender(true)}
            className="flex items-center gap-2 rounded-md bg-[#F04444] px-5 py-2 text-xs font-bold text-white hover:bg-[#dc3535] disabled:opacity-50 cursor-pointer shadow-lg"
          >
            <Play className="h-4 w-4" />
            {isRendering
              ? "Đang Render H.264 MP4 bằng FFmpeg..."
              : "Render & Xuất MP4 ngay"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Quality Control Checklist & Cost Guard (6 cols) */}
        <div className="col-span-6 space-y-5">
          {/* Quality Control Card */}
          <div className="rounded-lg border border-[#292930] bg-[#18181D] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#22C55E]" />
                Pre-Render Quality Control (PRD Mục 6.9)
              </h3>
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${
                  qualityReport?.passed
                    ? "bg-[#22C55E]/20 text-[#22C55E]"
                    : "bg-[#F59E0B]/20 text-[#F59E0B]"
                }`}
              >
                {qualityReport?.passed ? "PASSED" : "NEEDS REVIEW"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded border border-[#292930] bg-[#111114] p-2.5">
                <div className="text-lg font-bold text-[#F5F5F5]">
                  {qualityReport?.total_scenes ?? scenes.length}
                </div>
                <div className="text-[11px] text-[#92929B]">Tổng số cảnh</div>
              </div>
              <div className="rounded border border-[#292930] bg-[#111114] p-2.5">
                <div className="text-lg font-bold text-[#22C55E]">
                  {qualityReport?.approved_scenes ?? 0}
                </div>
                <div className="text-[11px] text-[#92929B]">Đã duyệt (APPROVED)</div>
              </div>
              <div className="rounded border border-[#292930] bg-[#111114] p-2.5">
                <div className="text-lg font-bold text-[#38BDF8]">
                  {Math.round((qualityReport?.audio_coverage_ratio ?? 1) * 100)}%
                </div>
                <div className="text-[11px] text-[#92929B]">Đồng bộ Audio gốc</div>
              </div>
            </div>

            {qualityReport && qualityReport.issues.length > 0 ? (
              <div className="space-y-1.5 pt-2">
                {qualityReport.issues.map((iss, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 rounded border p-2 text-xs ${
                      iss.severity === "error"
                        ? "border-[#F04444]/50 bg-[#F04444]/10 text-[#F04444]"
                        : "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                    }`}
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{iss.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded border border-[#22C55E]/30 bg-[#22C55E]/10 p-3 text-xs text-[#22C55E]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  Tất cả các cảnh đều có đầy đủ hình ảnh, chuyển động 2D Rig, tham chiếu đúng Character ID đã khóa và đồng bộ 100% với lời thoại gốc.
                </span>
              </div>
            )}
          </div>

          {/* Cost Control & Usage Card */}
          <div className="rounded-lg border border-[#292930] bg-[#18181D] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[#F04444]" />
                Cost Control & Token/Provider Usage (PRD Mục 10 & O)
              </h3>
              <span className="font-mono text-xs text-[#92929B]">
                Ngân sách tối đa: ${activeProject.budget_limit_usd.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded border border-[#292930] bg-[#111114] p-3">
                <div className="text-xs text-[#92929B]">Chi phí dự kiến</div>
                <div className="text-base font-mono font-bold text-[#F5F5F5]">
                  ${costs.total_estimated_usd.toFixed(4)} USD
                </div>
              </div>
              <div className="rounded border border-[#292930] bg-[#111114] p-3">
                <div className="text-xs text-[#92929B]">Chi phí thực tế đã dùng</div>
                <div className="text-base font-mono font-bold text-[#22C55E]">
                  ${costs.total_actual_usd.toFixed(4)} USD
                </div>
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {costs.records.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between rounded border border-[#292930] bg-[#111114] px-3 py-1.5 text-[11px]"
                >
                  <div>
                    <span className="font-semibold text-[#F5F5F5]">
                      {rec.operation}
                    </span>
                    <span className="ml-2 font-mono text-[#92929B]">
                      ({rec.provider} · {rec.model})
                    </span>
                  </div>
                  <span className="font-mono text-[#F5F5F5]">
                    ${rec.actual_cost_usd.toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Output MP4 Video Player & Export Specs (6 cols) */}
        <div className="col-span-6 rounded-lg border border-[#292930] bg-[#18181D] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5]">
                MP4 Video Output ({activeProject.aspect_ratio} ·{" "}
                {activeProject.resolution} · H.264 + AAC)
              </h3>
              <p className="text-xs text-[#92929B]">
                Render thực tế bằng FFmpeg với chuyển động khớp xương 2D và âm thanh gốc
              </p>
            </div>
            {latestRender && (
              <span
                className={`rounded px-2.5 py-1 font-mono text-xs font-semibold ${
                  latestRender.status === "COMPLETED"
                    ? "bg-[#22C55E]/20 text-[#22C55E]"
                    : latestRender.status === "RUNNING"
                    ? "bg-[#38BDF8]/20 text-[#38BDF8]"
                    : "bg-[#F04444]/20 text-[#F04444]"
                }`}
              >
                {latestRender.status} ({latestRender.progress}%)
              </span>
            )}
          </div>

          {latestRender?.status === "COMPLETED" &&
          latestRender.output_asset_id ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg border border-[#292930] bg-black">
                <video
                  key={latestRender.output_asset_id}
                  controls
                  className="max-h-[340px] w-full"
                  src={`/api/v1/projects/${activeProject.id}/export?download=1&t=${latestRender.completed_at}`}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[#22C55E]/40 bg-[#22C55E]/10 p-3">
                <div className="text-xs text-[#F5F5F5]">
                  <div className="font-semibold text-[#22C55E]">
                    File MP4 đã sẵn sàng tải xuống!
                  </div>
                  <div className="text-[11px] text-[#92929B]">
                    Codec: H.264 (yuv420p) + AAC Audio · Tỷ lệ:{" "}
                    {activeProject.aspect_ratio} ({activeProject.resolution})
                  </div>
                </div>
                <a
                  href={`/api/v1/projects/${activeProject.id}/export?download=1`}
                  download={`${activeProject.name.replace(/\s+/g, "_")}.mp4`}
                  className="flex items-center gap-1.5 rounded-md bg-[#22C55E] px-4 py-2 text-xs font-bold text-black hover:bg-[#1ea950]"
                >
                  <Download className="h-4 w-4" /> Tải xuống MP4
                </a>
              </div>
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-[#292930] bg-[#111114] p-6 text-center">
              <Film className="h-10 w-10 text-[#92929B] mb-2" />
              <div className="text-sm font-medium text-[#F5F5F5]">
                {isRendering
                  ? "FFmpeg đang tổng hợp khung hình 2D Rig và ghép Audio gốc..."
                  : "Chưa có bản xuất MP4 cho dự án này"}
              </div>
              <p className="mt-1 max-w-md text-xs text-[#92929B]">
                Nhấn nút &ldquo;Render & Xuất MP4 ngay&rdquo; ở góc phải phía trên để tạo file video MP4 thực tế.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. ASSET LIBRARY VIEW (WITH VERSION HISTORY)
// ============================================================================
export const AssetLibraryView: React.FC = () => {
  const { activeProject, assets, loadProjectWorkspace, notify } =
    useDarktoonStore();
  const [filterType, setFilterType] = useState<string>("all");

  if (!activeProject) {
    return (
      <div className="p-8 text-center text-[#92929B]">
        Vui lòng chọn dự án từ Dashboard.
      </div>
    );
  }

  const filtered = assets.filter((a) =>
    filterType === "all" ? true : a.asset_type === filterType
  );

  const handleRetryAsset = async (assetId: string) => {
    const res = await fetch(`/api/v1/assets/${assetId}/retry`, {
      method: "POST",
    });
    if (res.ok) {
      await loadProjectWorkspace(activeProject.id);
      notify("success", "Đã tạo phiên bản Asset mới (Version + 1).");
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-[#292930] pb-4">
        <div>
          <h1 className="text-lg font-bold text-[#F5F5F5] flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-[#F04444]" />
            Versioned Asset Library ({assets.length} Assets)
          </h1>
          <p className="text-xs text-[#92929B]">
            Mỗi lần Regenerate tạo ra một Asset Version mới (v1, v2...) và giữ lại lịch sử để rollback theo đúng quy tắc PRD Mục 5.3.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {["all", "scene_image", "character_reference", "rendered_video"].map(
            (type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`rounded px-3 py-1.5 text-xs font-medium cursor-pointer ${
                  filterType === type
                    ? "bg-[#F04444] text-white"
                    : "border border-[#292930] bg-[#18181D] text-[#92929B]"
                }`}
              >
                {type === "all" ? "Tất cả" : type}
              </button>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {filtered.map((asset) => (
          <div
            key={asset.id}
            className="rounded-lg border border-[#292930] bg-[#18181D] p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="rounded bg-[#111114] px-2 py-0.5 font-mono font-semibold text-[#F5F5F5] border border-[#292930]">
                {asset.asset_type} · v{asset.version}
              </span>
              {asset.is_mock ? (
                <span className="rounded bg-[#F59E0B]/20 px-2 py-0.5 font-mono text-[10px] text-[#F59E0B]">
                  [MOCK]
                </span>
              ) : (
                <span className="rounded bg-[#22C55E]/20 px-2 py-0.5 font-mono text-[10px] text-[#22C55E]">
                  {asset.provider}
                </span>
              )}
            </div>

            {asset.storage_key.endsWith(".svg") && (
              <div className="overflow-hidden rounded border border-[#292930] bg-[#0B0B0D]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/v1/assets/${asset.id}?raw=1`}
                  alt={asset.prompt}
                  className="h-36 w-full object-cover"
                />
              </div>
            )}

            <p className="line-clamp-2 text-xs text-[#92929B]">
              {asset.prompt || asset.storage_key}
            </p>

            <div className="flex items-center justify-between border-t border-[#292930] pt-2 text-[11px] text-[#92929B]">
              <span>
                {asset.width}×{asset.height} · {asset.model}
              </span>
              <div className="flex items-center gap-2">
                {asset.scene_id && (
                  <button
                    type="button"
                    onClick={() => handleRetryAsset(asset.id)}
                    className="flex items-center gap-1 rounded border border-[#292930] bg-[#111114] px-2 py-1 text-[#F5F5F5] hover:border-[#F04444] cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" /> Tạo bản mới
                  </button>
                )}
                <a
                  href={`/api/v1/assets/${asset.id}?raw=1`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-[#292930] bg-[#111114] px-2 py-1 text-[#F5F5F5] hover:border-[#38BDF8]"
                >
                  Mở file
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 3. AI PROVIDER CONFIGURATION & PROJECT SETTINGS VIEW
// ============================================================================
export const SettingsAndProvidersView: React.FC = () => {
  const {
    activeProject,
    providerStatuses,
    providerDefaults,
    fetchProvidersStatus,
    loadProjectWorkspace,
    notify,
  } = useDarktoonStore();

  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [replicateKey, setReplicateKey] = useState("");
  const [defaultAsr, setDefaultAsr] = useState(
    String(providerDefaults.DEFAULT_ASR_PROVIDER || "openai")
  );
  const [defaultLlm, setDefaultLlm] = useState(
    String(providerDefaults.DEFAULT_LLM_PROVIDER || "openai")
  );
  const [defaultImg, setDefaultImg] = useState(
    String(providerDefaults.DEFAULT_IMAGE_PROVIDER || "openai")
  );
  const [defaultVid, setDefaultVid] = useState(
    String(providerDefaults.DEFAULT_VIDEO_PROVIDER || "gemini")
  );

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    activeProject?.aspect_ratio || "16:9"
  );
  const [resolution, setResolution] = useState<Resolution>(
    activeProject?.resolution || "1080p"
  );
  const [budgetLimit, setBudgetLimit] = useState<number>(
    activeProject?.budget_limit_usd || 10
  );

  const handleSaveProviders = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, string> = {
      DEFAULT_ASR_PROVIDER: defaultAsr,
      DEFAULT_DIARIZATION_PROVIDER: defaultAsr,
      DEFAULT_LLM_PROVIDER: defaultLlm,
      DEFAULT_IMAGE_PROVIDER: defaultImg,
      DEFAULT_VIDEO_PROVIDER: defaultVid,
    };
    if (openaiKey.trim()) payload.OPENAI_API_KEY = openaiKey.trim();
    if (geminiKey.trim()) payload.GEMINI_API_KEY = geminiKey.trim();
    if (replicateKey.trim()) payload.REPLICATE_API_TOKEN = replicateKey.trim();

    const res = await fetch("/api/v1/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await fetchProvidersStatus();
      setOpenaiKey("");
      setGeminiKey("");
      setReplicateKey("");
      notify("success", "Đã cập nhật cấu hình AI Provider Adapter thành công!");
    }
  };

  const handleSaveProjectSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    const res = await fetch(`/api/v1/projects/${activeProject.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aspect_ratio: aspectRatio,
        resolution,
        budget_limit_usd: budgetLimit,
      }),
    });
    if (res.ok) {
      await loadProjectWorkspace(activeProject.id);
      notify("success", "Đã lưu cấu hình dự án.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[#F5F5F5] flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-[#F04444]" />
          AI Provider Adapter Architecture & Project Settings (PRD Mục 9)
        </h1>
        <p className="text-xs text-[#92929B]">
          Nguyên tắc minh bạch: Nếu nhà cung cấp AI chưa có API key, hệ thống hiển thị rõ trạng thái NOT_CONFIGURED, tuyệt đối không dựng kết quả giả thành kết quả AI thật.
        </p>
      </div>

      {/* Live Provider Status Table */}
      <div className="rounded-lg border border-[#292930] bg-[#18181D] p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
          Trạng thái Kết nối AI Providers hiện tại
        </h2>
        <div className="grid grid-cols-1 gap-2.5">
          {providerStatuses.map((st) => (
            <div
              key={st.capability}
              className="flex items-center justify-between rounded-lg border border-[#292930] bg-[#111114] px-4 py-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold uppercase text-[#F5F5F5]">
                    {st.capability}Provider
                  </span>
                  <span className="text-xs text-[#92929B]">
                    ({st.active_provider.toUpperCase()} · {st.model})
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[#92929B]">{st.message}</p>
              </div>

              <span
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-xs font-semibold ${
                  st.status === "CONFIGURED"
                    ? "bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40"
                    : st.status === "DEV_MOCK_ACTIVE"
                    ? "bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40"
                    : "bg-[#F04444]/20 text-[#F04444] border border-[#F04444]/40"
                }`}
              >
                {st.status === "CONFIGURED" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5" />
                )}
                {st.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Configure Keys & Default Providers (7 cols) */}
        <form
          onSubmit={handleSaveProviders}
          className="col-span-7 rounded-lg border border-[#292930] bg-[#18181D] p-5 space-y-4"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
            Cấu hình API Keys (Lưu tại Backend Database, không lộ trên Client)
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#92929B] mb-1">
                Default ASR / Diarization Provider
              </label>
              <select
                value={defaultAsr}
                onChange={(e) => setDefaultAsr(e.target.value)}
                className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-2.5 py-1.5 text-xs text-[#F5F5F5]"
              >
                <option value="openai">OpenAI Whisper</option>
                <option value="gemini">Google Gemini Audio</option>
                <option value="mock">Development Mock ([MOCK])</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#92929B] mb-1">
                Default LLM Story Director
              </label>
              <select
                value={defaultLlm}
                onChange={(e) => setDefaultLlm(e.target.value)}
                className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-2.5 py-1.5 text-xs text-[#F5F5F5]"
              >
                <option value="openai">OpenAI GPT-4o</option>
                <option value="gemini">Google Gemini 2.5</option>
                <option value="mock">Development Mock ([MOCK])</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#92929B] mb-1">
                Default Image Provider
              </label>
              <select
                value={defaultImg}
                onChange={(e) => setDefaultImg(e.target.value)}
                className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-2.5 py-1.5 text-xs text-[#F5F5F5]"
              >
                <option value="openai">OpenAI DALL-E 3</option>
                <option value="gemini">Google Imagen 3</option>
                <option value="mock">Development Mock ([MOCK])</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#92929B] mb-1">
                Default Video Provider
              </label>
              <select
                value={defaultVid}
                onChange={(e) => setDefaultVid(e.target.value)}
                className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-2.5 py-1.5 text-xs text-[#F5F5F5]"
              >
                <option value="gemini">Google Veo 2</option>
                <option value="replicate">Replicate / Kling</option>
                <option value="mock">Development Mock ([MOCK])</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <div>
              <label className="block text-xs text-[#92929B] mb-1">
                OPENAI_API_KEY{" "}
                {providerDefaults.OPENAI_KEY_SET ? "(Đã lưu ✅)" : "(Chưa nhập)"}
              </label>
              <input
                type="password"
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-3 py-1.5 text-xs text-[#F5F5F5]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#92929B] mb-1">
                GEMINI_API_KEY{" "}
                {providerDefaults.GEMINI_KEY_SET ? "(Đã lưu ✅)" : "(Chưa nhập)"}
              </label>
              <input
                type="password"
                placeholder="AIza..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-3 py-1.5 text-xs text-[#F5F5F5]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#92929B] mb-1">
                REPLICATE_API_TOKEN{" "}
                {providerDefaults.REPLICATE_KEY_SET
                  ? "(Đã lưu ✅)"
                  : "(Chưa nhập)"}
              </label>
              <input
                type="password"
                placeholder="r8_..."
                value={replicateKey}
                onChange={(e) => setReplicateKey(e.target.value)}
                className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-3 py-1.5 text-xs text-[#F5F5F5]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="rounded-md bg-[#F04444] px-4 py-2 text-xs font-semibold text-white hover:bg-[#dc3535] cursor-pointer"
          >
            Lưu cấu hình AI Providers
          </button>
        </form>

        {/* Project Settings (5 cols) */}
        <form
          onSubmit={handleSaveProjectSettings}
          className="col-span-5 rounded-lg border border-[#292930] bg-[#18181D] p-5 space-y-4"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-1.5">
            <Sliders className="h-4 w-4 text-[#F04444]" />
            Cấu hình Dự án hiện tại
          </h3>

          <div>
            <label className="block text-xs text-[#92929B] mb-1">
              Tỷ lệ khung hình (Aspect Ratio)
            </label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-3 py-1.5 text-xs text-[#F5F5F5]"
            >
              <option value="16:9">16:9 — YouTube / Landscape</option>
              <option value="9:16">9:16 — TikTok / Shorts / Reels</option>
              <option value="1:1">1:1 — Social Post</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#92929B] mb-1">
              Độ phân giải (Resolution)
            </label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value as Resolution)}
              className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-3 py-1.5 text-xs text-[#F5F5F5]"
            >
              <option value="1080p">Full HD 1080p</option>
              <option value="720p">HD 720p</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#92929B] mb-1">
              Ngân sách tối đa (Budget Cap USD)
            </label>
            <input
              type="number"
              step={1}
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(Number(e.target.value))}
              className="w-full rounded border border-[#292930] bg-[#0B0B0D] px-3 py-1.5 text-xs text-[#F5F5F5]"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md border border-[#292930] bg-[#111114] py-2 text-xs font-semibold text-[#F5F5F5] hover:border-[#F04444] cursor-pointer"
          >
            Cập nhật thông số Dự án
          </button>
        </form>
      </div>
    </div>
  );
};

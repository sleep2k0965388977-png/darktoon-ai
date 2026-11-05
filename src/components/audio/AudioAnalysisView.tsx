"use client";

import React, { useState } from "react";
import {
  AudioWaveform,
  BrainCircuit,
  FileAudio,
  Save,
  Sparkles,
  Upload,
  Users,
  Wand2,
} from "lucide-react";
import { ALL_EXPRESSIONS, CharacterExpression } from "@/types/darktoon";
import { WaveformPlayer } from "@/components/audio/WaveformPlayer";
import { useDarktoonStore } from "@/stores/useDarktoonStore";

export const AudioAnalysisView: React.FC = () => {
  const {
    activeProject,
    audio,
    transcript,
    speakers,
    scenes,
    currentTime,
    isPlaying,
    setCurrentTime,
    setIsPlaying,
    setActiveView,
    loadProjectWorkspace,
    notify,
  } = useDarktoonStore();

  const [selectedProvider, setSelectedProvider] = useState<
    "mock" | "openai" | "gemini"
  >("mock");
  const [customScript, setCustomScript] = useState(
    "Có những ngày tôi chỉ muốn ở một mình trong căn phòng tối.\nTôi đã mở điện thoại lên rất nhiều lần, nhìn vào danh bạ rồi lại lặng lẽ khóa màn hình.\nCậu lúc nào cũng nói mình ổn, nhưng ánh mắt cậu khi nhìn ra cửa sổ thành phố lại chẳng giấu được sự mệt mỏi.\nCó lẽ bước qua đêm dài này, tôi sẽ học cách đối diện với khoảng lặng của chính mình."
  );
  const [busyStep, setBusyStep] = useState<string | null>(null);
  const [editedSegments, setEditedSegments] = useState<
    Record<
      string,
      {
        text?: string;
        speaker_id?: string | null;
        emotion?: CharacterExpression;
      }
    >
  >({});

  if (!activeProject) {
    return (
      <div className="p-8 text-center text-[#92929B]">
        Vui lòng chọn dự án từ Dashboard.
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusyStep("uploading");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `/api/v1/projects/${activeProject.id}/audio/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Lỗi tải file audio.");
      await loadProjectWorkspace(activeProject.id);
      notify(
        "success",
        `Đã tải lên file audio gốc '${file.name}' (${data.audio.duration}s).`
      );
    } catch (err) {
      notify("error", err instanceof Error ? err.message : String(err));
    } finally {
      setBusyStep(null);
    }
  };

  const handleGenerateSampleWav = async () => {
    setBusyStep("uploading");
    try {
      const res = await fetch(
        `/api/v1/projects/${activeProject.id}/audio/upload`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_name: "hoi_thoai_dem_khuya_master.wav",
            duration: 24,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Lỗi tạo audio mẫu.");
      await loadProjectWorkspace(activeProject.id);
      notify(
        "success",
        `Đã khởi tạo file WAV hội thoại mẫu (${data.audio.duration}s).`
      );
    } catch (err) {
      notify("error", err instanceof Error ? err.message : String(err));
    } finally {
      setBusyStep(null);
    }
  };

  const handleRunAudioAnalysis = async () => {
    setBusyStep("analyzing");
    try {
      const res = await fetch(
        `/api/v1/projects/${activeProject.id}/audio/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: selectedProvider,
            custom_transcript_hint: customScript,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Lỗi phân tích audio.");
      }
      setEditedSegments({});
      await loadProjectWorkspace(activeProject.id);
      notify(
        "success",
        `Đã hoàn tất ASR Transcription, Speaker Diarization (${data.speakers?.length} người nói) & Story Analysis.`
      );
    } catch (err) {
      notify("error", err instanceof Error ? err.message : String(err));
    } finally {
      setBusyStep(null);
    }
  };

  const handleSaveTranscriptEdits = async () => {
    if (!transcript) return;
    setBusyStep("saving_transcript");
    try {
      const updates = Object.entries(editedSegments).map(([id, changes]) => ({
        id,
        ...changes,
      }));
      const res = await fetch(
        `/api/v1/projects/${activeProject.id}/transcript`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segments: updates }),
        }
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error?.message || "Lỗi lưu chỉnh sửa transcript.");
      setEditedSegments({});
      await loadProjectWorkspace(activeProject.id);
      notify("success", "Đã lưu chỉnh sửa Transcript & gán người nói.");
    } catch (err) {
      notify("error", err instanceof Error ? err.message : String(err));
    } finally {
      setBusyStep(null);
    }
  };

  const handleGenerateStoryboard = async () => {
    setBusyStep("generating_storyboard");
    try {
      const res = await fetch(
        `/api/v1/projects/${activeProject.id}/storyboard/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: selectedProvider }),
        }
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error?.message || "Lỗi tạo Storyboard.");
      await loadProjectWorkspace(activeProject.id, "storyboard");
      notify(
        "success",
        `AI Director đã tạo ${data.scenes?.length} cảnh Storyboard + khóa hồ sơ nhân vật!`
      );
    } catch (err) {
      notify("error", err instanceof Error ? err.message : String(err));
    } finally {
      setBusyStep(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      {/* Top Header & Provider Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#292930] pb-4">
        <div>
          <h1 className="text-lg font-bold text-[#F5F5F5] flex items-center gap-2">
            <AudioWaveform className="h-5 w-5 text-[#F04444]" />
            Audio Upload, Speaker Diarization & AI Story Understanding
          </h1>
          <p className="text-xs text-[#92929B]">
            Audio gốc được giữ nguyên làm nguồn thời gian chính (Master Clock). Kiểm tra và chỉnh sửa lời thoại trước khi tạo Storyboard.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[#292930] bg-[#18181D] px-3 py-1.5 text-xs">
            <span className="text-[#92929B]">AI Adapter:</span>
            <select
              value={selectedProvider}
              onChange={(e) =>
                setSelectedProvider(
                  e.target.value as "mock" | "openai" | "gemini"
                )
              }
              className="bg-transparent font-medium text-[#F5F5F5] focus:outline-none"
            >
              <option value="mock" className="bg-[#18181D]">
                Development Mock ([MOCK] - Sẵn sàng)
              </option>
              <option value="openai" className="bg-[#18181D]">
                OpenAI (Whisper + GPT-4o)
              </option>
              <option value="gemini" className="bg-[#18181D]">
                Google Gemini 2.5
              </option>
            </select>
          </div>

          <button
            type="button"
            disabled={busyStep !== null}
            onClick={handleGenerateStoryboard}
            className="flex items-center gap-2 rounded-md bg-[#F04444] px-4 py-2 text-xs font-semibold text-white hover:bg-[#dc3535] disabled:opacity-50 cursor-pointer shadow-lg"
          >
            <Wand2 className="h-4 w-4" />
            {busyStep === "generating_storyboard"
              ? "Đang tạo Storyboard & 2D Rig..."
              : "Bước tiếp: AI Tạo Storyboard →"}
          </button>
        </div>
      </div>

      {/* Upload & Waveform Section */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-5 rounded-lg border border-[#292930] bg-[#18181D] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-1.5">
              <FileAudio className="h-4 w-4 text-[#F04444]" />
              1. Nguồn File Audio Hội Thoại
            </span>
            <span className="text-[11px] text-[#92929B]">
              MP3 · WAV · M4A · AAC · FLAC
            </span>
          </div>

          <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#292930] bg-[#111114] p-5 text-center hover:border-[#F04444] transition cursor-pointer">
            <Upload className="h-6 w-6 text-[#92929B] mb-1.5" />
            <span className="text-xs font-medium text-[#F5F5F5]">
              Kéo thả hoặc nhấn để tải lên file Audio (.mp3, .wav, .m4a, .aac, .flac)
            </span>
            <span className="mt-1 text-[11px] text-[#92929B]">
              {audio
                ? `Hiện tại: ${audio.file_name} (${audio.duration}s · ${(
                    audio.file_size / 1024
                  ).toFixed(0)} KB)`
                : "Chưa có file audio"}
            </span>
            <input
              type="file"
              accept=".mp3,.wav,.m4a,.aac,.flac,audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              disabled={busyStep !== null}
              onClick={handleGenerateSampleWav}
              className="rounded border border-[#292930] bg-[#111114] px-3 py-1.5 text-xs text-[#F5F5F5] hover:border-[#F04444] cursor-pointer"
            >
              Tạo lại file WAV Hội thoại mẫu (24s)
            </button>

            <button
              type="button"
              disabled={busyStep !== null}
              onClick={handleRunAudioAnalysis}
              className="flex items-center gap-1.5 rounded bg-[#22C55E] px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-[#1ea950] cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {busyStep === "analyzing"
                ? "Đang phân tích..."
                : "Phân tích Audio (ASR + Diarization)"}
            </button>
          </div>

          {selectedProvider === "mock" && (
            <div className="pt-2">
              <label className="block text-[11px] text-[#92929B] mb-1">
                Kịch bản lời thoại dùng cho chế độ [MOCK] Development Mode (mỗi dòng 1 lượt thoại):
              </label>
              <textarea
                rows={4}
                value={customScript}
                onChange={(e) => setCustomScript(e.target.value)}
                className="w-full rounded border border-[#292930] bg-[#0B0B0D] p-2 text-xs text-[#F5F5F5]"
              />
            </div>
          )}
        </div>

        <div className="col-span-7 space-y-4">
          {audio && (
            <WaveformPlayer
              projectId={activeProject.id}
              fileName={audio.file_name}
              duration={audio.duration}
              waveform={audio.waveform}
              currentTime={currentTime}
              onTimeUpdate={(sec) => setCurrentTime(sec)}
              isPlaying={isPlaying}
              onPlayToggle={(p) => setIsPlaying(p)}
              scenes={scenes}
            />
          )}

          {/* Speakers List */}
          <div className="rounded-lg border border-[#292930] bg-[#18181D] p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[#F04444]" />
                Danh sách Người nói (Speaker Diarization: {speakers.length})
              </h3>
              {transcript?.is_mock && (
                <span className="rounded bg-[#F59E0B]/20 px-2 py-0.5 font-mono text-[10px] text-[#F59E0B] border border-[#F59E0B]/40">
                  [MOCK DATA]
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {speakers.map((spk) => (
                <div
                  key={spk.id}
                  className="rounded border border-[#292930] bg-[#111114] p-2.5"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-[#F5F5F5]">
                    <span>{spk.display_name}</span>
                    <span className="font-mono text-[10px] text-[#92929B]">
                      {spk.speaker_code}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#92929B]">
                    {spk.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Editor & Story Analysis */}
      {transcript && (
        <div className="grid grid-cols-12 gap-6">
          {/* Editable Transcript Segments (7 cols) */}
          <div className="col-span-7 rounded-lg border border-[#292930] bg-[#18181D] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F5F5F5]">
                  2. Transcript & Gán Người Nói / Cảm Xúc ({transcript.segments.length} phân đoạn)
                </h3>
                <p className="text-[11px] text-[#92929B]">
                  Chỉnh sửa trực tiếp văn bản, người nói và cảm xúc trước khi AI tạo Storyboard
                </p>
              </div>
              {Object.keys(editedSegments).length > 0 && (
                <button
                  type="button"
                  onClick={handleSaveTranscriptEdits}
                  className="flex items-center gap-1.5 rounded bg-[#22C55E] px-3 py-1.5 text-xs font-semibold text-black cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" /> Lưu thay đổi Transcript
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {transcript.segments.map((seg) => {
                const edits = editedSegments[seg.id] || {};
                const currentText =
                  edits.text !== undefined ? edits.text : seg.text;
                const currentSpeakerId =
                  edits.speaker_id !== undefined
                    ? edits.speaker_id
                    : seg.speaker_id;
                const currentEmotion =
                  edits.emotion !== undefined ? edits.emotion : seg.emotion;

                return (
                  <div
                    key={seg.id}
                    className="rounded-lg border border-[#292930] bg-[#111114] p-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setCurrentTime(seg.start_time)}
                        className="rounded bg-[#0B0B0D] px-2 py-0.5 font-mono text-[11px] text-[#F04444] border border-[#292930] cursor-pointer"
                      >
                        {seg.start_time.toFixed(1)}s → {seg.end_time.toFixed(1)}s
                      </button>

                      <div className="flex items-center gap-2">
                        <select
                          value={currentSpeakerId || ""}
                          onChange={(e) =>
                            setEditedSegments((prev) => ({
                              ...prev,
                              [seg.id]: {
                                ...prev[seg.id],
                                speaker_id: e.target.value || null,
                              },
                            }))
                          }
                          className="rounded border border-[#292930] bg-[#0B0B0D] px-2 py-1 text-xs text-[#F5F5F5]"
                        >
                          {speakers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.display_name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={currentEmotion}
                          onChange={(e) =>
                            setEditedSegments((prev) => ({
                              ...prev,
                              [seg.id]: {
                                ...prev[seg.id],
                                emotion: e.target.value as CharacterExpression,
                              },
                            }))
                          }
                          className="rounded border border-[#292930] bg-[#0B0B0D] px-2 py-1 text-xs text-[#F5F5F5]"
                        >
                          {ALL_EXPRESSIONS.map((exp) => (
                            <option key={exp} value={exp}>
                              Cảm xúc: {exp}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <textarea
                      rows={2}
                      value={currentText}
                      onChange={(e) =>
                        setEditedSegments((prev) => ({
                          ...prev,
                          [seg.id]: {
                            ...prev[seg.id],
                            text: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded border border-[#292930] bg-[#0B0B0D] p-2 text-xs text-[#F5F5F5] focus:border-[#F04444] focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Story Understanding Panel (5 cols) */}
          <div className="col-span-5 rounded-lg border border-[#292930] bg-[#18181D] p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#F5F5F5]">
              <BrainCircuit className="h-4 w-4 text-[#F04444]" />
              3. AI Story Understanding (PRD Mục 6.3)
            </div>

            <div className="rounded border border-[#292930] bg-[#111114] p-3 space-y-1.5">
              <div className="text-xs font-semibold text-[#F5F5F5]">
                Tóm tắt cốt truyện (Story Summary)
              </div>
              <p className="text-xs text-[#92929B] leading-relaxed">
                {transcript.story_analysis.summary}
              </p>
            </div>

            <div className="rounded border border-[#292930] bg-[#111114] p-3 space-y-1.5">
              <div className="text-xs font-semibold text-[#22C55E]">
                A. Điều người nói thực sự kể (Explicit Facts)
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#92929B]">
                {transcript.story_analysis.explicit_facts.map((fact, idx) => (
                  <li key={idx}>{fact}</li>
                ))}
              </ul>
            </div>

            <div className="rounded border border-[#292930] bg-[#111114] p-3 space-y-1.5">
              <div className="text-xs font-semibold text-[#38BDF8]">
                B. Điều suy luận từ ngữ cảnh (Contextual Inferences)
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#92929B]">
                {transcript.story_analysis.contextual_inferences.map(
                  (inf, idx) => (
                    <li key={idx}>{inf}</li>
                  )
                )}
              </ul>
            </div>

            <div className="rounded border border-[#292930] bg-[#111114] p-3 space-y-1.5">
              <div className="text-xs font-semibold text-[#F59E0B]">
                C. Hình ảnh minh họa biểu tượng (Visual Metaphors)
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#92929B]">
                {transcript.story_analysis.visual_metaphors.map((met, idx) => (
                  <li key={idx}>{met}</li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setActiveView("storyboard")}
              className="w-full rounded-md border border-[#292930] bg-[#111114] py-2 text-xs font-semibold text-[#F5F5F5] hover:border-[#F04444] cursor-pointer"
            >
              Mở Storyboard Editor ({scenes.length} Scenes) →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

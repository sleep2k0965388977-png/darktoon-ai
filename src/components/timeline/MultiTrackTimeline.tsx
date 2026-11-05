"use client";

import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { SceneRecord, TimelineTrack } from "@/types/darktoon";

interface MultiTrackTimelineProps {
  tracks: TimelineTrack[];
  scenes: SceneRecord[];
  duration: number;
  currentTime: number;
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string, jumpToStart?: boolean) => void;
  onSeek: (timeSec: number) => void;
  onToggleTrackMute: (trackId: string, muted: boolean) => void;
  onChangeTrackVolume: (trackId: string, volume: number) => void;
}

export const MultiTrackTimeline: React.FC<MultiTrackTimelineProps> = ({
  tracks,
  scenes,
  duration,
  currentTime,
  selectedSceneId,
  onSelectScene,
  onSeek,
  onToggleTrackMute,
  onChangeTrackVolume,
}) => {
  const totalSec = Math.max(
    1,
    duration || (scenes.length > 0 ? scenes[scenes.length - 1].end_time : 24)
  );

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(Number((ratio * totalSec).toFixed(2)));
  };

  return (
    <div className="border-t border-[#292930] bg-[#111114] p-3 select-none">
      <div className="mb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold uppercase tracking-wider text-[#F5F5F5]">
            Multi-Track Master Timeline
          </span>
          <span className="text-[#92929B]">
            Đồng bộ khóa cứng theo Timestamp Audio gốc ({totalSec.toFixed(1)}s)
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[#92929B]">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#22C55E]" /> Approved
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#38BDF8]" /> Generated
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#F59E0B]" /> Needs Review
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="grid grid-cols-[210px_1fr] items-center gap-2 rounded border border-[#292930] bg-[#18181D] px-2.5 py-1.5"
          >
            {/* Track Header + Mute + Volume */}
            <div className="flex items-center justify-between pr-2 border-r border-[#292930]">
              <div className="truncate text-xs font-medium text-[#F5F5F5]">
                {track.name}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onToggleTrackMute(track.id, !track.muted)}
                  className={`rounded p-1 cursor-pointer ${
                    track.muted
                      ? "bg-[#F04444]/20 text-[#F04444]"
                      : "text-[#92929B] hover:text-[#F5F5F5]"
                  }`}
                  title={track.muted ? "Bật tiếng track" : "Tắt tiếng track"}
                >
                  {track.muted ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={track.muted ? 0 : track.volume}
                  onChange={(e) =>
                    onChangeTrackVolume(track.id, parseFloat(e.target.value))
                  }
                  className="w-12 accent-[#F04444] cursor-pointer"
                  title={`Âm lượng: ${Math.round(track.volume * 100)}%`}
                />
              </div>
            </div>

            {/* Track Lane */}
            <div
              onClick={handleTimelineClick}
              className="relative h-7 w-full cursor-pointer overflow-hidden rounded bg-[#0B0B0D]"
            >
              {/* Playhead */}
              <div
                style={{
                  left: `${Math.min(100, (currentTime / totalSec) * 100)}%`,
                }}
                className="pointer-events-none absolute top-0 bottom-0 z-20 w-[2px] bg-[#F04444]"
              />

              {track.clips.map((clip) => {
                const leftPct = (clip.start_time / totalSec) * 100;
                const widthPct = Math.max(
                  2,
                  ((clip.end_time - clip.start_time) / totalSec) * 100
                );
                const isSelected =
                  clip.scene_id && clip.scene_id === selectedSceneId;
                const meta = clip.metadata || {};

                let bgColor = "bg-[#23232E] border-[#383846]";
                if (track.track_type === "audio_master") {
                  bgColor = "bg-[#F04444]/25 border-[#F04444]/60";
                } else if (track.track_type === "scene") {
                  bgColor =
                    meta.status === "APPROVED"
                      ? "bg-[#22C55E]/25 border-[#22C55E]"
                      : meta.status === "NEEDS_REVIEW"
                      ? "bg-[#F59E0B]/25 border-[#F59E0B]"
                      : "bg-[#38BDF8]/20 border-[#38BDF8]/60";
                } else if (track.track_type === "animation") {
                  bgColor = "bg-purple-500/20 border-purple-500/50";
                } else if (track.track_type === "subtitle") {
                  bgColor = "bg-zinc-800 border-zinc-600";
                } else if (track.track_type === "music") {
                  bgColor = "bg-emerald-950/60 border-emerald-700/50";
                }

                return (
                  <div
                    key={clip.id}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (clip.scene_id) {
                        onSelectScene(clip.scene_id, true);
                      } else {
                        onSeek(clip.start_time);
                      }
                    }}
                    className={`absolute top-0.5 bottom-0.5 flex items-center overflow-hidden rounded border px-1.5 text-[10px] text-[#F5F5F5] transition ${bgColor} ${
                      isSelected ? "ring-1 ring-[#F5F5F5]" : ""
                    }`}
                  >
                    <span className="truncate">
                      {String(
                        meta.title ||
                          meta.method ||
                          meta.text ||
                          meta.label ||
                          "Clip"
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

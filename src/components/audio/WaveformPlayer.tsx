"use client";

import React, { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

interface WaveformPlayerProps {
  projectId: string;
  fileName: string;
  duration: number;
  waveform: number[];
  currentTime: number;
  onTimeUpdate: (sec: number) => void;
  isPlaying: boolean;
  onPlayToggle: (playing: boolean) => void;
  scenes?: Array<{
    id: string;
    sequence_index: number;
    start_time: number;
    end_time: number;
  }>;
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  projectId,
  fileName,
  duration,
  waveform,
  currentTime,
  onTimeUpdate,
  isPlaying,
  onPlayToggle,
  scenes = [],
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const safeDuration = Math.max(1, duration || 24);
  const peaks =
    waveform && waveform.length > 0
      ? waveform
      : Array.from({ length: 80 }, (_, i) =>
          Number((0.2 + Math.abs(Math.sin(i * 0.4)) * 0.65).toFixed(2))
        );

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.play().catch(() => {
        // Fallback timer if browser autoplay policy blocks or audio element is loading
      });
    } else {
      el.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      const el = audioRef.current;
      if (el && !el.paused && el.currentTime > 0) {
        onTimeUpdate(el.currentTime);
      } else {
        onTimeUpdate(
          currentTime + 0.1 >= safeDuration ? 0 : Number((currentTime + 0.1).toFixed(2))
        );
      }
    }, 100);
    return () => clearInterval(timer);
  }, [isPlaying, currentTime, safeDuration, onTimeUpdate]);

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const nextSec = Number((ratio * safeDuration).toFixed(2));
    onTimeUpdate(nextSec);
    if (audioRef.current) {
      audioRef.current.currentTime = nextSec;
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ms}`;
  };

  return (
    <div className="rounded-lg border border-[#292930] bg-[#18181D] p-3">
      <audio
        ref={audioRef}
        src={`/api/v1/projects/${projectId}/audio?stream=1`}
        muted={muted}
        onEnded={() => onPlayToggle(false)}
        className="hidden"
      />

      <div className="mb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onPlayToggle(!isPlaying)}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F04444] text-white hover:bg-[#dc3535] transition cursor-pointer"
            title={isPlaying ? "Tạm dừng" : "Phát Audio gốc"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className="flex h-7 w-7 items-center justify-center rounded border border-[#292930] bg-[#111114] text-[#92929B] hover:text-[#F5F5F5] cursor-pointer"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
          <div>
            <div className="font-medium text-[#F5F5F5]">{fileName}</div>
            <div className="text-[11px] text-[#92929B]">
              Master Original Audio Track (Không thay thế bằng giọng AI)
            </div>
          </div>
        </div>
        <div className="font-mono text-xs text-[#F5F5F5] bg-[#111114] px-2.5 py-1 rounded border border-[#292930]">
          {formatTime(currentTime)} / {formatTime(safeDuration)}
        </div>
      </div>

      {/* Interactive Waveform Canvas Bar */}
      <div
        onClick={handleBarClick}
        className="relative flex h-16 w-full cursor-pointer items-center gap-[2px] overflow-hidden rounded bg-[#0B0B0D] px-2 border border-[#292930]"
      >
        {/* Scene boundary markers */}
        {scenes.map((sc) => {
          const leftPct = (sc.start_time / safeDuration) * 100;
          return (
            <div
              key={sc.id}
              style={{ left: `${leftPct}%` }}
              className="pointer-events-none absolute top-0 bottom-0 border-l border-[#292930] z-10"
            >
              <span className="bg-[#111114] px-1 text-[9px] font-mono text-[#92929B]">
                S{sc.sequence_index}
              </span>
            </div>
          );
        })}

        {/* Playhead Line */}
        <div
          style={{ left: `${Math.min(100, (currentTime / safeDuration) * 100)}%` }}
          className="pointer-events-none absolute top-0 bottom-0 z-20 w-[2px] bg-[#F04444]"
        />

        {peaks.map((pk, idx) => {
          const barSec = (idx / peaks.length) * safeDuration;
          const isPlayed = barSec <= currentTime;
          return (
            <div
              key={idx}
              className="flex-1 rounded-full transition-colors"
              style={{
                height: `${Math.max(12, Math.round(pk * 88))}%`,
                backgroundColor: isPlayed ? "#F04444" : "#3A3A46",
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

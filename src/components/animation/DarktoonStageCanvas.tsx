"use client";

import React from "react";
import {
  AspectRatio,
  BackgroundPresetId,
  CameraMovement,
  CameraShot,
  CharacterAction,
  CharacterExpression,
  CharacterProfile,
  SceneProp,
} from "@/types/darktoon";
import {
  BACKGROUND_PRESETS,
  DEFAULT_CHARACTER_PALETTES,
  getRigPoseForAction,
} from "@/backend/animations/presets";

interface StageCharacterItem {
  profile: CharacterProfile;
  action: CharacterAction;
  expression: CharacterExpression;
  position: "left" | "center" | "right" | "foreground" | "background";
}

interface DarktoonStageCanvasProps {
  aspectRatio?: AspectRatio;
  backgroundId: BackgroundPresetId;
  characters: StageCharacterItem[];
  props: SceneProp[];
  cameraShot?: CameraShot;
  cameraMovement?: CameraMovement;
  subtitleText?: string;
  timeInSceneSec: number;
  isPlaying?: boolean;
  isMock?: boolean;
  animationMethod?: string;
  compact?: boolean;
}

export const DarktoonStageCanvas: React.FC<DarktoonStageCanvasProps> = ({
  aspectRatio = "16:9",
  backgroundId,
  characters,
  props,
  cameraShot = "medium",
  cameraMovement = "slow_push_in",
  subtitleText,
  timeInSceneSec,
  isPlaying = false,
  isMock = false,
  animationMethod = "RIG_2D",
  compact = false,
}) => {
  const width = aspectRatio === "9:16" ? 608 : aspectRatio === "1:1" ? 720 : 960;
  const height = aspectRatio === "9:16" ? 1080 : aspectRatio === "1:1" ? 720 : 540;
  const floorY = Math.round(height * 0.78);
  const bg = BACKGROUND_PRESETS[backgroundId] || BACKGROUND_PRESETS.bg_living_room;

  // Camera transform computation - dynamic cinematic framing
  const baseShotScale =
    cameraShot === "extreme_close_up"
      ? 1.72
      : cameraShot === "close_up"
      ? 1.42
      : cameraShot === "wide"
      ? 0.84
      : 1.05;

  const camCenterY =
    cameraShot === "extreme_close_up"
      ? height * 0.38
      : cameraShot === "close_up"
      ? height * 0.44
      : height * 0.5;

  const moveDelta =
    cameraMovement === "slow_push_in"
      ? Math.min(0.2, timeInSceneSec * 0.026)
      : cameraMovement === "slow_pull_out"
      ? -Math.min(0.18, timeInSceneSec * 0.022)
      : 0;

  const panX =
    cameraMovement === "pan_right"
      ? (timeInSceneSec - 3) * 12
      : cameraMovement === "pan_left"
      ? -(timeInSceneSec - 3) * 12
      : cameraMovement === "subtle_drift"
      ? Math.sin(timeInSceneSec * 1.1) * 10
      : 0;

  const panY =
    cameraMovement === "subtle_drift"
      ? Math.cos(timeInSceneSec * 0.9) * 6
      : 0;

  const totalCamScale = Number((baseShotScale + moveDelta).toFixed(3));

  // Tách văn bản dài thành từng câu ngắn hiển thị đồng bộ theo thời gian thoại (Short Subtitle Sentences)
  const activeSentence = React.useMemo(() => {
    if (!subtitleText || !subtitleText.trim()) return "";
    const sents = subtitleText
      .split(/(?<=[.?!;])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (sents.length <= 1) return subtitleText;

    const totalChars = sents.reduce((acc, s) => acc + Math.max(12, s.length), 0);
    const estDuration = Math.max(8, sents.length * 3.6);
    let elapsed = 0;

    for (let i = 0; i < sents.length; i++) {
      const s = sents[i];
      const dur = (Math.max(12, s.length) / totalChars) * estDuration;
      if (timeInSceneSec <= elapsed + dur || i === sents.length - 1) {
        return s;
      }
      elapsed += dur;
    }
    return sents[0];
  }, [subtitleText, timeInSceneSec]);

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-[#292930] bg-[#0B0B0D] select-none shadow-2xl"
      style={{
        aspectRatio:
          aspectRatio === "9:16"
            ? "9 / 16"
            : aspectRatio === "1:1"
            ? "1 / 1"
            : "16 / 9",
        maxHeight: compact ? "140px" : "460px",
        width: "100%",
      }}
    >
      {/* Top HUD Overlay Badges */}
      {!compact && (
        <div className="pointer-events-none absolute top-3 left-3 right-3 z-20 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#111114]/90 px-2 py-0.5 font-mono text-[#F5F5F5] border border-[#292930]">
              {animationMethod}
            </span>
            <span className="rounded bg-[#111114]/90 px-2 py-0.5 text-[#92929B] border border-[#292930]">
              CAM: {cameraShot.toUpperCase()} · {cameraMovement.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isMock && (
              <span className="rounded bg-[#F59E0B]/20 px-2 py-0.5 font-mono font-semibold text-[#F59E0B] border border-[#F59E0B]/50">
                [MOCK DATA - DEV MODE]
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Articulated 2D SVG Stage */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full block"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id={`bgGrad_${backgroundId}`} cx="50%" cy="38%" r="72%">
            <stop offset="0%" stopColor={bg.secondaryColor} />
            <stop offset="100%" stopColor={bg.primaryColor} />
          </radialGradient>
          <radialGradient id={`spotGrad_${backgroundId}`} cx="50%" cy="28%" r="48%">
            <stop offset="0%" stopColor={bg.accentGlow} stopOpacity="0.22" />
            <stop offset="100%" stopColor={bg.accentGlow} stopOpacity="0" />
          </radialGradient>
          {/* Anime Studio / Dusk Sky Gradients */}
          <linearGradient id="animeSunsetSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E1B4B" />
            <stop offset="35%" stopColor="#4C1D95" />
            <stop offset="65%" stopColor="#831843" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="animeDeskCone" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.35" />
            <stop offset="40%" stopColor="#F59E0B" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="animeIrisGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E1B4B" />
            <stop offset="45%" stopColor="#312E81" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
          <linearGradient id="animeHairShine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0" />
            <stop offset="50%" stopColor="#BAE6FD" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
          </linearGradient>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Camera Viewport Group */}
        <g
          transform={`translate(${width / 2 + panX}, ${camCenterY + panY}) scale(${totalCamScale}) translate(${-width / 2}, ${-camCenterY})`}
        >
          {/* Background Sky / Wall */}
          <rect width={width} height={height} fill={`url(#bgGrad_${backgroundId})`} />
          <rect width={width} height={height} fill={`url(#spotGrad_${backgroundId})`} />

          {/* Floor Plane */}
          <rect
            x={0}
            y={floorY}
            width={width}
            height={height - floorY}
            fill="#070709"
          />
          <line
            x1={0}
            y1={floorY}
            x2={width}
            y2={floorY}
            stroke="#292930"
            strokeWidth={2}
          />

          {/* Environment Architecture by Background ID - Anime Aesthetic */}
          {backgroundId === "bg_desk_workspace" && (
            <g id="env_desk_workspace">
              {/* Cozy Anime Studio Window overlooking Twilight City */}
              <rect x={width * 0.05} y={height * 0.1} width={width * 0.22} height={height * 0.44} rx={6} fill="#090A14" stroke="#252538" strokeWidth={2} />
              <rect x={width * 0.06} y={height * 0.12} width={width * 0.2} height={height * 0.4} rx={4} fill="url(#animeSunsetSky)" opacity={0.65} />
              {/* Distant city silhouette in window */}
              <rect x={width * 0.08} y={height * 0.28} width={width * 0.05} height={height * 0.24} fill="#06070D" />
              <rect x={width * 0.14} y={height * 0.22} width={width * 0.06} height={height * 0.3} fill="#0A0B14" />
              <rect x={width * 0.21} y={height * 0.32} width={width * 0.04} height={height * 0.2} fill="#06070D" />
              {/* Tiny glowing window dots in city */}
              <circle cx={width * 0.1} cy={height * 0.35} r={1.5} fill="#FEF08A" opacity={0.8} />
              <circle cx={width * 0.16} cy={height * 0.27} r={1.5} fill="#38BDF8" opacity={0.7} />
              <circle cx={width * 0.17} cy={height * 0.38} r={1.5} fill="#FEF08A" opacity={0.8} />
              {/* Window frame grid */}
              <line x1={width * 0.16} y1={height * 0.1} x2={width * 0.16} y2={height * 0.54} stroke="#1E1E2C" strokeWidth={2} />
              <line x1={width * 0.05} y1={height * 0.32} x2={width * 0.27} y2={height * 0.32} stroke="#1E1E2C" strokeWidth={2} />

              {/* Fairy Lights string dangled across wall */}
              <path d={`M ${width * 0.04} ${height * 0.08} Q ${width * 0.2} ${height * 0.14} ${width * 0.38} ${height * 0.08}`} fill="none" stroke="#333344" strokeWidth={1} />
              {[0.08, 0.14, 0.2, 0.26, 0.32].map((fx, i) => (
                <circle key={`fairy_${i}`} cx={width * fx} cy={height * 0.1 + Math.sin(i * 1.2) * 8} r={3} fill="#FDE047" opacity={0.85 + Math.sin(timeInSceneSec * 3 + i) * 0.15} filter="url(#softGlow)" />
              ))}

              {/* Wall bookshelf with anime manga & figures */}
              <rect x={width * 0.76} y={height * 0.12} width={width * 0.18} height={height * 0.26} rx={4} fill="#141420" stroke="#2B2B3E" strokeWidth={2} />
              <line x1={width * 0.76} y1={height * 0.25} x2={width * 0.94} y2={height * 0.25} stroke="#2B2B3E" strokeWidth={2} />
              <rect x={width * 0.78} y={height * 0.15} width={width * 0.025} height={height * 0.09} rx={1} fill="#6366F1" opacity={0.7} />
              <rect x={width * 0.81} y={height * 0.16} width={width * 0.02} height={height * 0.08} rx={1} fill="#EC4899" opacity={0.7} />
              <rect x={width * 0.835} y={height * 0.14} width={width * 0.028} height={height * 0.1} rx={1} fill="#10B981" opacity={0.7} />
              {/* Cute mini plant on shelf */}
              <ellipse cx={width * 0.89} cy={height * 0.23} rx={9} ry={5} fill="#475569" />
              <circle cx={width * 0.89} cy={height * 0.2} r={7} fill="#10B981" opacity={0.85} />

              {/* Desk Lamp with soft warm volumetric cone */}
              <polygon points={`${width * 0.72},${height * 0.28} ${width * 0.32},${floorY} ${width * 0.9},${floorY}`} fill="url(#animeDeskCone)" />
              <path d={`M ${width * 0.76} ${floorY - 60} L ${width * 0.74} ${height * 0.32} L ${width * 0.71} ${height * 0.28}`} fill="none" stroke="#64748B" strokeWidth={3} strokeLinecap="round" />
              <ellipse cx={width * 0.71} cy={height * 0.28} rx={16} ry={7} fill="#F59E0B" filter="url(#softGlow)" />

              {/* Study Desk with wooden warmth */}
              <rect x={width * 0.24} y={floorY - 76} width={width * 0.52} height={14} rx={3} fill="#1E1B2E" stroke="#3D3A54" strokeWidth={2} />
              <line x1={width * 0.28} y1={floorY - 62} x2={width * 0.28} y2={floorY} stroke="#2D2B3E" strokeWidth={5} />
              <line x1={width * 0.72} y1={floorY - 62} x2={width * 0.72} y2={floorY} stroke="#2D2B3E" strokeWidth={5} />

              {/* Laptop with glowing visualizer / code wallpaper */}
              <rect x={width * 0.36} y={floorY - 120} width={width * 0.11} height={44} rx={4} fill="#0F172A" stroke="#38BDF8" strokeWidth={1.8} />
              <rect x={width * 0.37} y={floorY - 114} width={width * 0.09} height={32} rx={2} fill="#1E293B" />
              {/* Glowing anime audio waveforms on laptop screen */}
              {Array.from({ length: 9 }).map((_, wIdx) => {
                const barH = 6 + Math.sin(timeInSceneSec * 5 + wIdx * 0.8) * 8;
                return (
                  <rect
                    key={`wave_${wIdx}`}
                    x={width * 0.38 + wIdx * 7}
                    y={floorY - 96 - barH / 2}
                    width={4}
                    height={barH}
                    rx={1.5}
                    fill={wIdx % 2 === 0 ? "#38BDF8" : "#818CF8"}
                  />
                );
              })}

              {/* Steaming Coffee / Matcha Mug */}
              <rect x={width * 0.58} y={floorY - 96} width={16} height={18} rx={3} fill="#F1F5F9" />
              <path d={`M ${width * 0.58 + 16} ${floorY - 92} C ${width * 0.58 + 22} ${floorY - 92} ${width * 0.58 + 22} ${floorY - 84} ${width * 0.58 + 16} ${floorY - 84}`} fill="none" stroke="#F1F5F9" strokeWidth={2} />
              {/* Animated rising steam curls */}
              <path
                d={`M ${width * 0.58 + 8} ${floorY - 98} Q ${width * 0.58 + 5 + Math.sin(timeInSceneSec * 3) * 4} ${floorY - 108} ${width * 0.58 + 10 + Math.cos(timeInSceneSec * 2.5) * 4} ${floorY - 118}`}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth={1.5}
                strokeLinecap="round"
                opacity={0.5}
              />

              {/* Studio Podcast Condenser Mic on cantilever boom arm */}
              <path d={`M ${width * 0.65} ${floorY - 76} L ${width * 0.63} ${floorY - 128} L ${width * 0.56} ${floorY - 138}`} fill="none" stroke="#475569" strokeWidth={3} strokeLinecap="round" />
              <circle cx={width * 0.56} cy={floorY - 138} r={4} fill="#64748B" />
              {/* Mic Body (Shure SM7B aesthetic) */}
              <rect x={width * 0.54} y={floorY - 152} width={12} height={26} rx={5} fill="#1E293B" stroke="#475569" strokeWidth={1.5} transform={`rotate(25, ${width * 0.54 + 6}, ${floorY - 139})`} />
              {/* Mic Red On-Air LED Ring */}
              <circle cx={width * 0.548} cy={floorY - 146} r={2.5} fill="#EF4444" filter="url(#softGlow)" />
            </g>
          )}

          {backgroundId === "bg_bedroom" && (
            <g id="env_balcony_autumn">
              {/* Makoto Shinkai Sunset / Twilight Sky Gradient */}
              <rect x={0} y={0} width={width} height={floorY} fill="url(#animeSunsetSky)" opacity={0.88} />
              {/* Distant Tokyo Skyline Silhouettes */}
              <rect x={width * 0.08} y={height * 0.34} width={width * 0.12} height={floorY - height * 0.34} fill="#090A14" />
              <rect x={width * 0.22} y={height * 0.28} width={width * 0.14} height={floorY - height * 0.28} fill="#0E1020" />
              <rect x={width * 0.45} y={height * 0.2} width={width * 0.12} height={floorY - height * 0.2} fill="#0C0D1B" />
              <rect x={width * 0.6} y={height * 0.15} width={width * 0.16} height={floorY - height * 0.15} fill="#131428" />
              <rect x={width * 0.78} y={height * 0.24} width={width * 0.18} height={floorY - height * 0.24} fill="#0A0B16" />

              {/* Iconic Tokyo Radio Tower Silhouette with blinking red warning beacon */}
              <polygon points={`${width * 0.40},${floorY} ${width * 0.44},${floorY} ${width * 0.422},${height * 0.14}`} fill="#16182E" />
              <circle cx={width * 0.422} cy={height * 0.14} r={3} fill="#EF4444" opacity={0.6 + Math.sin(timeInSceneSec * 4) * 0.4} filter="url(#softGlow)" />

              {/* Glowing amber & cyan apartment window dots */}
              {[0.24, 0.28, 0.48, 0.52, 0.63, 0.67, 0.72, 0.82, 0.86].map((wx, i) => (
                <rect key={`win_${i}`} x={width * wx} y={height * 0.24 + (i % 4) * 22} width={4} height={5} rx={1} fill={i % 3 === 0 ? "#38BDF8" : "#FDE047"} opacity={0.75} />
              ))}

              {/* Crescent Moon glowing softly */}
              <circle cx={width * 0.86} cy={height * 0.12} r={20} fill="#FEF08A" opacity={0.8} filter="url(#softGlow)" />
              <circle cx={width * 0.835} cy={height * 0.1} r={18} fill="#1E1B4B" />

              {/* Aesthetic Balcony Railing with Japanese Plant Planter */}
              <rect x={width * 0.38} y={floorY - 88} width={width * 0.62} height={88} fill="none" stroke="#2B2B3E" strokeWidth={2.5} />
              {Array.from({ length: 9 }).map((_, rIdx) => (
                <line key={`rail_${rIdx}`} x1={width * 0.4 + rIdx * (width * 0.065)} y1={floorY - 88} x2={width * 0.4 + rIdx * (width * 0.065)} y2={floorY} stroke="#2B2B3E" strokeWidth={2} />
              ))}
              <rect x={width * 0.36} y={floorY - 92} width={width * 0.64} height={7} rx={2} fill="#3D3D54" />
              {/* Balcony Potted Plant */}
              <ellipse cx={width * 0.88} cy={floorY - 94} rx={14} ry={6} fill="#475569" />
              <path d={`M ${width * 0.88} ${floorY - 94} Q ${width * 0.86} ${floorY - 116} ${width * 0.83} ${floorY - 122} M ${width * 0.88} ${floorY - 94} Q ${width * 0.9} ${floorY - 114} ${width * 0.93} ${floorY - 120}`} fill="none" stroke="#10B981" strokeWidth={3} strokeLinecap="round" />
            </g>
          )}

          {backgroundId === "bg_night_street" && (
            <g id="env_night_street">
              {/* City building silhouette */}
              <polygon points={`0,${height * 0.32} ${width * 0.22},${height * 0.24} ${width * 0.42},${height * 0.36} ${width * 0.42},${floorY} 0,${floorY}`} fill="#0A0B14" />
              <rect x={width * 0.04} y={height * 0.36} width={width * 0.14} height={floorY - height * 0.36} fill="#0E1020" />

              {/* Japanese Retro Neon Shop Sign: "珈琲 CAFE" & "BAR" */}
              <rect x={width * 0.08} y={height * 0.38} width={width * 0.08} height={22} rx={4} fill="#1E1428" stroke="#F43F5E" strokeWidth={1.8} />
              <text x={width * 0.12} y={height * 0.38 + 15} textAnchor="middle" fill="#FDA4AF" fontSize="12" fontWeight="bold" fontFamily="monospace" filter="url(#softGlow)">CAFE</text>
              <rect x={width * 0.09} y={height * 0.44} width={width * 0.06} height={18} rx={3} fill="#0F172A" stroke="#38BDF8" strokeWidth={1.6} />
              <text x={width * 0.12} y={height * 0.44 + 13} textAnchor="middle" fill="#7DD3FC" fontSize="10" fontWeight="bold" fontFamily="sans-serif">BAR</text>

              {/* Vintage Curved Cast-Iron Streetlamp */}
              <polygon
                points={`${width * 0.3},${height * 0.18} ${width * 0.04},${floorY} ${width * 0.68},${floorY}`}
                fill="url(#animeDeskCone)"
                opacity={0.7}
              />
              <line x1={width * 0.25} y1={height * 0.18} x2={width * 0.25} y2={floorY} stroke="#333846" strokeWidth={8} strokeLinecap="round" />
              <path d={`M ${width * 0.25} ${height * 0.24} Q ${width * 0.25} ${height * 0.16} ${width * 0.3} ${height * 0.18}`} fill="none" stroke="#333846" strokeWidth={6} strokeLinecap="round" />
              <polygon points={`${width * 0.28},${height * 0.16} ${width * 0.32},${height * 0.16} ${width * 0.33},${height * 0.2} ${width * 0.27},${height * 0.2}`} fill="#475569" />
              <ellipse cx={width * 0.3} cy={height * 0.2} rx={16} ry={7} fill="#FEF3C7" filter="url(#softGlow)" />

              {/* Wet Asphalt Ground with golden & cyan light puddle reflections */}
              <ellipse cx={width * 0.32} cy={floorY + 16} rx={width * 0.18} ry={12} fill="#F59E0B" opacity={0.22} filter="url(#softGlow)" />
              <ellipse cx={width * 0.12} cy={floorY + 24} rx={width * 0.08} ry={7} fill="#F43F5E" opacity={0.16} />
              <ellipse cx={width * 0.62} cy={floorY + 18} rx={width * 0.12} ry={8} fill="#38BDF8" opacity={0.14} />
              <line x1={0} y1={floorY + 10} x2={width} y2={floorY + 10} stroke="#222332" strokeWidth={3} strokeDasharray="28 14" />
            </g>
          )}

          {backgroundId === "bg_living_room" && (
            <g id="env_living_room">
              {/* Large Aesthetic Floor-to-Ceiling Rain Window */}
              <rect x={width * 0.58} y={height * 0.08} width={width * 0.36} height={height * 0.44} rx={6} fill="#090E1A" stroke="#2B2D40" strokeWidth={3} />
              <line x1={width * 0.76} y1={height * 0.08} x2={width * 0.76} y2={height * 0.52} stroke="#2B2D40" strokeWidth={2.5} />
              <line x1={width * 0.58} y1={height * 0.3} x2={width * 0.94} y2={height * 0.3} stroke="#2B2D40" strokeWidth={2.5} />

              {/* Rain Streaks trickling down glass */}
              {Array.from({ length: 8 }).map((_, rIdx) => {
                const rx = width * (0.61 + rIdx * 0.04);
                const ry = height * 0.12 + ((timeInSceneSec * 45 + rIdx * 30) % (height * 0.36));
                return (
                  <line key={`drop_${rIdx}`} x1={rx} y1={ry} x2={rx - 1} y2={ry + 14} stroke="#94A3B8" strokeWidth={1.5} opacity={0.5} strokeLinecap="round" />
                );
              })}

              {/* Moving blurred bokeh traffic headlights through rain */}
              <circle cx={width * 0.66 + Math.sin(timeInSceneSec * 1.5) * 24} cy={height * 0.44} r={6} fill="#EF4444" opacity={0.65} filter="url(#softGlow)" />
              <circle cx={width * 0.82 + Math.cos(timeInSceneSec * 1.8) * 26} cy={height * 0.44} r={7} fill="#FDE047" opacity={0.7} filter="url(#softGlow)" />

              {/* Potted Indoor Monstera Plant */}
              <ellipse cx={width * 0.52} cy={floorY - 20} rx={16} ry={7} fill="#334155" />
              <path d={`M ${width * 0.52} ${floorY - 20} Q ${width * 0.48} ${floorY - 60} ${width * 0.44} ${floorY - 80}`} fill="none" stroke="#059669" strokeWidth={4} strokeLinecap="round" />
              <path d={`M ${width * 0.52} ${floorY - 20} Q ${width * 0.55} ${floorY - 55} ${width * 0.58} ${floorY - 74}`} fill="none" stroke="#10B981" strokeWidth={3.5} strokeLinecap="round" />
              <ellipse cx={width * 0.44} cy={floorY - 80} rx={18} ry={11} fill="#059669" opacity={0.85} transform={`rotate(-25, ${width * 0.44}, ${floorY - 80})`} />
              <ellipse cx={width * 0.58} cy={floorY - 74} rx={15} ry={9} fill="#10B981" opacity={0.85} transform={`rotate(20, ${width * 0.58}, ${floorY - 74})`} />

              {/* Warm Floor Standing Lamp with soft cone */}
              <line x1={width * 0.92} y1={height * 0.22} x2={width * 0.92} y2={floorY} stroke="#3D3A50" strokeWidth={3.5} />
              <polygon points={`${width * 0.87},${height * 0.28} ${width * 0.97},${height * 0.28} ${width * 0.99},${height * 0.21} ${width * 0.85},${height * 0.21}`} fill="#FDE68A" opacity={0.8} filter="url(#softGlow)" />
              <polygon points={`${width * 0.92},${height * 0.28} ${width * 0.78},${floorY} ${width * 1.0},${floorY}`} fill="url(#animeDeskCone)" opacity={0.5} />
            </g>
          )}

          {backgroundId === "bg_mind_void" && (
            <g id="env_mind_void">
              {/* Ethereal Anime Cosmic Dreamscape */}
              <radialGradient id="nebulaCore" cx="50%" cy="40%" r="50%">
                <stop offset="0%" stopColor="#831843" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#4C1D95" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#050507" stopOpacity="0" />
              </radialGradient>
              <circle cx={width * 0.5} cy={height * 0.42} r={Math.min(width, height) * 0.42} fill="url(#nebulaCore)" />

              {/* Glowing sacred orbital rune rings */}
              <circle
                cx={width * 0.5}
                cy={height * 0.42}
                r={Math.min(width, height) * 0.32 + Math.sin(timeInSceneSec * 2) * 8}
                fill="none"
                stroke="#F43F5E"
                strokeWidth={2}
                strokeDasharray="14 10"
                opacity={0.65}
                filter="url(#softGlow)"
              />
              <circle
                cx={width * 0.5}
                cy={height * 0.42}
                r={Math.min(width, height) * 0.18 + Math.cos(timeInSceneSec * 2.5) * 6}
                fill="none"
                stroke="#818CF8"
                strokeWidth={1.5}
                strokeDasharray="8 8"
                opacity={0.5}
              />
              {/* Water reflection pool on floor */}
              <ellipse cx={width * 0.5} cy={floorY} rx={width * 0.34} ry={20} fill="#F43F5E" opacity={0.16} filter="url(#softGlow)" />

              {/* Floating Glowing Sakura / Star Petals drifting upwards */}
              {Array.from({ length: 8 }).map((_, sIdx) => {
                const sx = width * 0.25 + ((sIdx * 85 + Math.sin(timeInSceneSec * 1.5 + sIdx) * 35) % (width * 0.5));
                const sy = ((floorY - sIdx * 35 - timeInSceneSec * 28) % (height * 0.7)) + height * 0.1;
                return (
                  <circle
                    key={`sakura_${sIdx}`}
                    cx={sx}
                    cy={sy}
                    r={2.5 + (sIdx % 2)}
                    fill={sIdx % 2 === 0 ? "#F43F5E" : "#C084FC"}
                    opacity={0.7}
                    filter="url(#softGlow)"
                  />
                );
              })}
            </g>
          )}

          {/* Scene Props */}
          {props.map((prop, pIdx) => {
            const px =
              prop.position === "left"
                ? width * 0.3
                : prop.position === "right"
                ? width * 0.7
                : width * 0.5;
            if (prop.type === "sofa" || prop.type === "bench") {
              return (
                <g
                  key={`prop_${pIdx}`}
                  transform={`translate(${px - 140}, ${floorY - 68})`}
                >
                  <rect
                    x={0}
                    y={8}
                    width={280}
                    height={50}
                    rx={10}
                    fill="#16161D"
                    stroke="#2B2B36"
                    strokeWidth={2}
                  />
                  <rect
                    x={12}
                    y={34}
                    width={256}
                    height={28}
                    rx={7}
                    fill="#1E1E28"
                    stroke="#323240"
                    strokeWidth={1.5}
                  />
                </g>
              );
            }
            if (prop.type === "desk") {
              return (
                <g
                  key={`prop_${pIdx}`}
                  transform={`translate(${px - 110}, ${floorY - 78})`}
                >
                  <rect
                    x={0}
                    y={28}
                    width={220}
                    height={9}
                    rx={3}
                    fill="#22222C"
                    stroke="#363644"
                    strokeWidth={2}
                  />
                  <rect
                    x={78}
                    y={-12}
                    width={64}
                    height={40}
                    rx={4}
                    fill="#0F172A"
                    stroke="#38BDF8"
                    strokeWidth={1.5}
                  />
                </g>
              );
            }
            if (prop.type === "rain") {
              const rainOffset = (timeInSceneSec * 180) % 120;
              return (
                <g
                  key={`prop_${pIdx}`}
                  stroke="#64748B"
                  strokeWidth={1.2}
                  opacity={0.35}
                  transform={`translate(0, ${rainOffset})`}
                >
                  <line x1={width * 0.2} y1={40} x2={width * 0.18} y2={110} />
                  <line x1={width * 0.42} y1={80} x2={width * 0.4} y2={150} />
                  <line x1={width * 0.64} y1={30} x2={width * 0.62} y2={100} />
                  <line x1={width * 0.8} y1={90} x2={width * 0.78} y2={160} />
                </g>
              );
            }
            return null;
          })}

          {/* Atmospheric Particle Overlays: Autumn Leaves & Floating Ambient Motes */}
          {(backgroundId === "bg_bedroom" || backgroundId === "bg_night_street" || backgroundId === "bg_desk_workspace") && (
            <g id="env_particles" opacity={0.65}>
              {Array.from({ length: 6 }).map((_, pIdx) => {
                const px = ((pIdx * 160 + timeInSceneSec * 35) % (width + 60)) - 30;
                const py = (height * 0.2 + pIdx * 45 + Math.sin(timeInSceneSec * 1.5 + pIdx) * 18) % (floorY + 20);
                const rot = (timeInSceneSec * 40 + pIdx * 60) % 360;
                return (
                  <path
                    key={`leaf_${pIdx}`}
                    d="M 0 -5 C 4 -2 5 2 0 6 C -5 2 -4 -2 0 -5 Z"
                    fill={pIdx % 2 === 0 ? "#F59E0B" : "#D97706"}
                    transform={`translate(${px}, ${py}) rotate(${rot}) scale(1.2)`}
                    opacity={0.7}
                  />
                );
              })}
            </g>
          )}

          {/* Articulated 8-Part 2D Character Rigs - Anime Lofi Aesthetic */}
          {characters.map((item, idx) => {
            const { profile, action, expression, position } = item;
            const pose = getRigPoseForAction(action, timeInSceneSec + idx * 0.6);

            const isMain = !profile?.id || profile.id === "char_main" || idx === 0;
            // Outfit Colors: Aesthetic Lofi Dark Hoodie + Dark Denim + Sneakers
            const hoodieColor = isMain ? "#1C1E2B" : "#282A3A";
            const hoodieHighlight = isMain ? "#26293B" : "#35384D";
            const pantsColor = "#12131C";
            const skinTone = "#FFF3EB";
            const hairColor = "#141524";
            const sneakerColor = "#1E202E";

            const baseCx =
              position === "left"
                ? width * 0.32
                : position === "right"
                ? width * 0.68
                : position === "background"
                ? width * 0.58
                : width * 0.5;

            // Character movement: smoothly translate across canvas when walking or running
            const walkOffset =
              action === "walking"
                ? ((timeInSceneSec * 45) % (width * 0.46)) - (width * 0.16)
                : action === "running"
                ? ((timeInSceneSec * 90) % (width * 0.6)) - (width * 0.25)
                : 0;

            const cx = baseCx + walkOffset;

            const charScale =
              (position === "background"
                ? 0.76
                : position === "foreground"
                ? 1.12
                : 1.0) *
              (profile?.proportions?.height_scale || 1.0);

            const isSitting = action === "sitting" || pose.isSitting;
            const baseY = isSitting
              ? floorY - 105 * charScale + pose.torsoOffsetY * 0.3
              : floorY - 122 * charScale + pose.torsoOffsetY * 0.42;

            // Mouth lip-sync animation when playing and subtitle exists
            const isSpeaking =
              isPlaying && Boolean(subtitleText && subtitleText.trim().length > 0);
            const lipOpen = isSpeaking
              ? 3 + Math.abs(Math.sin(timeInSceneSec * 12)) * 6
              : 0;

            return (
              <g
                key={`${profile?.id || idx}_${idx}`}
                transform={`translate(${cx}, ${baseY}) scale(${charScale})`}
              >
                {/* Soft Contact Floor Shadow */}
                <ellipse
                  cx={0}
                  cy={isSitting ? 88 : 126}
                  rx={isSitting ? 52 : 44}
                  ry={9}
                  fill="#000000"
                  opacity={0.65}
                />

                {/* Ergonomic High-Back Studio Chair visible behind Character when seated */}
                {isSitting && (
                  <g id="studio_chair_back">
                    <rect x={-32} y={-44} width={64} height={72} rx={14} fill="#111219" stroke="#252736" strokeWidth={2.5} />
                    <rect x={-24} y={-36} width={48} height={56} rx={10} fill="#171822" />
                    {/* Chair Headrest */}
                    <rect x={-18} y={-64} width={36} height={16} rx={6} fill="#111219" stroke="#252736" strokeWidth={2} />
                  </g>
                )}

                {/* Part 1: Left Leg & Sneaker - Seated legs drop naturally downward */}
                <g transform={`translate(-11, 46) rotate(${isSitting ? 6 : pose.leftLegRotate})`}>
                  {/* Pants */}
                  <rect
                    x={-6}
                    y={0}
                    width={12}
                    height={isSitting ? 52 : 64}
                    rx={5}
                    fill={pantsColor}
                    stroke="#2D3042"
                    strokeWidth={1.5}
                  />
                  {/* Sneaker */}
                  <path d={`M -6 ${isSitting ? 46 : 56} L 6 ${isSitting ? 46 : 56} L 8 ${isSitting ? 56 : 68} L -8 ${isSitting ? 56 : 68} Z`} fill={sneakerColor} />
                  <rect x={-9} y={isSitting ? 54 : 66} width={18} height={4} rx={1.5} fill="#E2E8F0" />
                </g>

                {/* Part 2: Right Leg & Sneaker */}
                <g transform={`translate(11, 46) rotate(${isSitting ? -6 : pose.rightLegRotate})`}>
                  {/* Pants */}
                  <rect
                    x={-6}
                    y={0}
                    width={12}
                    height={isSitting ? 52 : 64}
                    rx={5}
                    fill={pantsColor}
                    stroke="#2D3042"
                    strokeWidth={1.5}
                  />
                  {/* Sneaker */}
                  <path d={`M -6 ${isSitting ? 46 : 56} L 6 ${isSitting ? 46 : 56} L 8 ${isSitting ? 56 : 68} L -8 ${isSitting ? 56 : 68} Z`} fill={sneakerColor} />
                  <rect x={-9} y={isSitting ? 54 : 66} width={18} height={4} rx={1.5} fill="#E2E8F0" />
                </g>

                {/* Part 3: Body / Torso (Oversized Aesthetic Anime Hoodie) */}
                <g transform={`rotate(${pose.torsoRotate})`}>
                  {/* Hoodie Body with soft curved silhouette */}
                  <rect
                    x={-26}
                    y={-22}
                    width={52}
                    height={74}
                    rx={18}
                    fill={hoodieColor}
                    stroke="#383C52"
                    strokeWidth={2}
                  />
                  {/* Hoodie Kangaroo Pocket */}
                  <path
                    d="M -16 26 L 16 26 L 13 44 L -13 44 Z"
                    fill={hoodieHighlight}
                    opacity={0.85}
                  />
                  {/* Hoodie drawstring ties with metal tips */}
                  <line x1={-5} y1={-12} x2={-5} y2={6} stroke="#94A3B8" strokeWidth={1.5} strokeLinecap="round" />
                  <line x1={5} y1={-12} x2={5} y2={6} stroke="#94A3B8" strokeWidth={1.5} strokeLinecap="round" />
                  <circle cx={-5} cy={7} r={1.5} fill="#CBD5E1" />
                  <circle cx={5} cy={7} r={1.5} fill="#CBD5E1" />

                  {/* Part 4: Left Arm (Hoodie Sleeve + Skin Hand) */}
                  <g transform={`translate(-26, -10) rotate(${pose.leftArmRotate})`}>
                    <rect
                      x={-7}
                      y={0}
                      width={14}
                      height={46}
                      rx={7}
                      fill={hoodieColor}
                      stroke="#383C52"
                      strokeWidth={1.8}
                    />
                    {/* Hand */}
                    <circle cx={0} cy={48} r={5.5} fill={skinTone} />
                  </g>

                  {/* Part 5: Right Arm (Hoodie Sleeve + Skin Hand + Phone) */}
                  <g transform={`translate(26, -10) rotate(${pose.rightArmRotate})`}>
                    <rect
                      x={-7}
                      y={0}
                      width={14}
                      height={46}
                      rx={7}
                      fill={hoodieColor}
                      stroke="#383C52"
                      strokeWidth={1.8}
                    />
                    {/* Hand */}
                    <circle cx={0} cy={48} r={5.5} fill={skinTone} />
                    {(pose.holdingPhone ||
                      action === "holding_phone" ||
                      action === "using_phone") && (
                      <g transform="translate(-4, 44)">
                        <rect
                          x={0}
                          y={0}
                          width={12}
                          height={20}
                          rx={2.5}
                          fill="#0F172A"
                          stroke="#38BDF8"
                          strokeWidth={1.6}
                        />
                        <circle
                          cx={6}
                          cy={10}
                          r={8}
                          fill="#38BDF8"
                          opacity={0.25}
                        />
                      </g>
                    )}
                  </g>

                  {/* Part 6: Head + Anime Hair + Expressive Anime Face + Studio Headphones */}
                  <g
                    transform={`translate(0, ${-54 + pose.headOffsetY}) rotate(${pose.headRotate})`}
                  >
                    {/* Back Hair Strands framing neck */}
                    <path
                      d="M -26 -14 C -32 4 -28 26 -20 34 C -16 18 -18 2 -16 -12 Z"
                      fill={hairColor}
                    />
                    <path
                      d="M 26 -14 C 32 4 28 26 20 34 C 16 18 18 2 16 -12 Z"
                      fill={hairColor}
                    />
                    <circle cx={0} cy={-16} r={22} fill={hairColor} />

                    {/* Neck */}
                    <rect x={-7} y={18} width={14} height={14} fill={skinTone} stroke="#222436" strokeWidth={1.2} />
                    <path d="M -7 20 Q 0 25 7 20" stroke="#F43F5E" strokeWidth={1.5} opacity={0.3} fill="none" />

                    {/* Anime Face Shape (Tapered chin, not a plain round circle) */}
                    <path
                      d="M -24 -6 C -24 10 -15 24 0 29 C 15 24 24 10 24 -6 C 24 -18 -24 -18 -24 -6 Z"
                      fill={skinTone}
                      stroke="#222436"
                      strokeWidth={1.8}
                    />

                    {/* Anime Hair Bangs & Layered Locks */}
                    <path
                      d="M -26 -10 Q -15 4 -7 -4 Q 0 8 7 -4 Q 15 4 26 -10 Q 20 -30 0 -30 Q -20 -30 -26 -10 Z"
                      fill={hairColor}
                    />
                    {/* Side hair locks framing cheeks */}
                    <path d="M -25 -8 C -27 2 -25 14 -22 18 C -22 10 -23 2 -21 -8 Z" fill={hairColor} />
                    <path d="M 25 -8 C 27 2 25 14 22 18 C 22 10 23 2 21 -8 Z" fill={hairColor} />

                    {/* Angel-Ring Hair Shine Halo Highlight */}
                    <path
                      d="M -16 -18 Q 0 -24 16 -18"
                      stroke="url(#animeHairShine)"
                      strokeWidth={3}
                      fill="none"
                      strokeLinecap="round"
                    />

                    {/* Over-Ear Studio Podcast Headphones (Lofi Girl icon) */}
                    <path d="M -26 -4 Q 0 -34 26 -4" stroke="#475569" strokeWidth={4} fill="none" strokeLinecap="round" />
                    <path d="M -26 -6 Q 0 -37 26 -6" stroke="#94A3B8" strokeWidth={1.4} fill="none" />
                    {/* Left & Right Cushioned Earcups with silver bezel */}
                    <rect x={-30} y={-8} width={6} height={20} rx={3} fill="#1E293B" stroke="#64748B" strokeWidth={1.5} />
                    <rect x={24} y={-8} width={6} height={20} rx={3} fill="#1E293B" stroke="#64748B" strokeWidth={1.5} />

                    {/* Soft Cheeks Anime Blush */}
                    <ellipse cx={-14} cy={7} rx={5.5} ry={2.8} fill="#FB7185" opacity={0.35} />
                    <ellipse cx={14} cy={7} rx={5.5} ry={2.8} fill="#FB7185" opacity={0.35} />

                    {/* Cute Anime Nose */}
                    <circle cx={0} cy={7} r={1.2} fill="#E29578" />

                    {/* Eyebrows by Expression */}
                    {(expression === "sad" ||
                      expression === "crying" ||
                      expression === "worried") && (
                      <g stroke="#1E202C" strokeWidth={2} strokeLinecap="round">
                        <line x1={-15} y1={-9} x2={-6} y2={-12} />
                        <line x1={6} y1={-12} x2={15} y2={-9} />
                      </g>
                    )}
                    {expression === "angry" && (
                      <g stroke="#1E202C" strokeWidth={2.4} strokeLinecap="round">
                        <line x1={-15} y1={-12} x2={-6} y2={-8} />
                        <line x1={6} y1={-8} x2={15} y2={-12} />
                      </g>
                    )}
                    {(expression === "happy" || expression === "neutral" || expression === "thinking") && (
                      <g stroke="#1E202C" strokeWidth={1.8} strokeLinecap="round">
                        <path d="M -15 -10 Q -10 -13 -5 -10" fill="none" />
                        <path d="M 5 -10 Q 10 -13 15 -10" fill="none" />
                      </g>
                    )}

                    {/* Part 7: Expressive Authentic Anime Eyes */}
                    {expression === "tired" ? (
                      <g stroke="#1E202C" strokeWidth={2.2} strokeLinecap="round">
                        <path d="M -15 -1 Q -10 -5 -5 -1" fill="none" />
                        <path d="M 5 -1 Q 10 -5 15 -1" fill="none" />
                      </g>
                    ) : expression === "happy" ? (
                      <g stroke="#1E202C" strokeWidth={2.5} strokeLinecap="round" fill="none">
                        <path d="M -15 0 Q -10 -6 -5 0" />
                        <path d="M 5 0 Q 10 -6 15 0" />
                      </g>
                    ) : (
                      <g>
                        {/* Left Eye */}
                        <g transform="translate(-10, -2)">
                          {/* Sclera / Eye White */}
                          <ellipse cx={0} cy={0} rx={6} ry={7} fill="#FFFFFF" />
                          {/* Rich Gradient Iris */}
                          <ellipse cx={0} cy={0} rx={4.6} ry={6} fill="url(#animeIrisGrad)" />
                          {/* Pupil */}
                          <ellipse cx={0} cy={0.5} rx={2.4} ry={3.2} fill="#0F172A" />
                          {/* Dual Specular Sparkle Catchlights */}
                          <circle cx={-1.5} cy={-2.2} r={1.8} fill="#FFFFFF" />
                          <circle cx={1.8} cy={1.8} r={1.0} fill="#FFFFFF" opacity={0.85} />
                          {/* Thick Winged Upper Eyelash */}
                          <path d="M -6.5 -3.5 Q 0 -8 6.5 -3.5 Q 8 -4.5 9 -7" stroke="#141524" strokeWidth={2.4} fill="none" strokeLinecap="round" />
                          {/* Delicate Lower Lash Hint */}
                          <path d="M -3.5 5.5 Q 0 7 3.5 5.5" stroke="#475569" strokeWidth={1.2} fill="none" strokeLinecap="round" />
                        </g>

                        {/* Right Eye */}
                        <g transform="translate(10, -2)">
                          {/* Sclera / Eye White */}
                          <ellipse cx={0} cy={0} rx={6} ry={7} fill="#FFFFFF" />
                          {/* Rich Gradient Iris */}
                          <ellipse cx={0} cy={0} rx={4.6} ry={6} fill="url(#animeIrisGrad)" />
                          {/* Pupil */}
                          <ellipse cx={0} cy={0.5} rx={2.4} ry={3.2} fill="#0F172A" />
                          {/* Dual Specular Sparkle Catchlights */}
                          <circle cx={-1.5} cy={-2.2} r={1.8} fill="#FFFFFF" />
                          <circle cx={1.8} cy={1.8} r={1.0} fill="#FFFFFF" opacity={0.85} />
                          {/* Thick Winged Upper Eyelash */}
                          <path d="M -6.5 -3.5 Q 0 -8 6.5 -3.5 Q 8 -4.5 9 -7" stroke="#141524" strokeWidth={2.4} fill="none" strokeLinecap="round" />
                          {/* Delicate Lower Lash Hint */}
                          <path d="M -3.5 5.5 Q 0 7 3.5 5.5" stroke="#475569" strokeWidth={1.2} fill="none" strokeLinecap="round" />
                        </g>
                      </g>
                    )}

                    {/* Part 8: Anime Mouth (Live Lip-sync with tongue and tooth accent) */}
                    {lipOpen > 2.2 ? (
                      <g>
                        <ellipse cx={0} cy={14} rx={5} ry={lipOpen} fill="#1E202C" />
                        <rect x={-3} y={14 - lipOpen * 0.7} width={6} height={lipOpen * 0.4} rx={1} fill="#FFFFFF" />
                        <ellipse cx={0} cy={14 + lipOpen * 0.3} rx={3.5} ry={lipOpen * 0.45} fill="#FB7185" />
                      </g>
                    ) : (
                      <path
                        d="M -4 13 Q 0 15 4 13"
                        stroke="#1E202C"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        fill="none"
                      />
                    )}
                  </g>
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Dedicated Short-Sentence Typography Subtitle Overlay (Chữ hiển thị ngắn gọn từng câu) */}
      {!compact && activeSentence && (
        <div className="pointer-events-none absolute bottom-4 left-6 right-6 z-20 flex justify-center">
          <div className="max-w-xl rounded-full bg-[#0B0B0D]/92 px-6 py-2 text-center text-xs md:text-sm font-medium tracking-wide text-[#F8FAFC] border border-[#3B82F6]/50 shadow-2xl backdrop-blur-md">
            &ldquo;{activeSentence}&rdquo;
          </div>
        </div>
      )}
    </div>
  );
};

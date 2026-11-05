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

  // Camera transform computation
  const baseShotScale =
    cameraShot === "extreme_close_up"
      ? 1.38
      : cameraShot === "close_up"
      ? 1.2
      : cameraShot === "wide"
      ? 0.92
      : 1.04;

  const moveDelta =
    cameraMovement === "slow_push_in"
      ? Math.min(0.16, timeInSceneSec * 0.022)
      : cameraMovement === "slow_pull_out"
      ? -Math.min(0.14, timeInSceneSec * 0.02)
      : 0;

  const panX =
    cameraMovement === "pan_right"
      ? (timeInSceneSec - 2) * 9
      : cameraMovement === "pan_left"
      ? -(timeInSceneSec - 2) * 9
      : cameraMovement === "subtle_drift"
      ? Math.sin(timeInSceneSec * 0.9) * 8
      : 0;

  const totalCamScale = Number((baseShotScale + moveDelta).toFixed(3));

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
          <radialGradient id={`bgGrad_${backgroundId}`} cx="50%" cy="40%" r="68%">
            <stop offset="0%" stopColor={bg.secondaryColor} />
            <stop offset="100%" stopColor={bg.primaryColor} />
          </radialGradient>
          <radialGradient id={`spotGrad_${backgroundId}`} cx="50%" cy="28%" r="48%">
            <stop offset="0%" stopColor={bg.accentGlow} stopOpacity="0.18" />
            <stop offset="100%" stopColor={bg.accentGlow} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Camera Viewport Group */}
        <g
          transform={`translate(${width / 2 + panX}, ${height / 2}) scale(${totalCamScale}) translate(${-width / 2}, ${-height / 2})`}
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

          {/* Environment Architecture by Background ID */}
          {(backgroundId === "bg_living_room" ||
            backgroundId === "bg_bedroom" ||
            backgroundId === "bg_cafe") && (
            <g>
              <rect
                x={width * 0.67}
                y={height * 0.14}
                width={width * 0.17}
                height={height * 0.34}
                rx={4}
                fill="#0D1322"
                stroke="#292930"
                strokeWidth={2.5}
              />
              <line
                x1={width * 0.755}
                y1={height * 0.14}
                x2={width * 0.755}
                y2={height * 0.48}
                stroke="#292930"
                strokeWidth={2}
              />
              <line
                x1={width * 0.67}
                y1={height * 0.31}
                x2={width * 0.84}
                y2={height * 0.31}
                stroke="#292930"
                strokeWidth={2}
              />
              {/* Blinking distant city lights */}
              <circle
                cx={width * 0.71}
                cy={height * 0.42}
                r={3}
                fill="#38BDF8"
                opacity={0.45 + Math.sin(timeInSceneSec * 2.5) * 0.3}
              />
              <circle
                cx={width * 0.79}
                cy={height * 0.39}
                r={2.5}
                fill="#F04444"
                opacity={0.4 + Math.cos(timeInSceneSec * 3.1) * 0.3}
              />
            </g>
          )}

          {(backgroundId === "bg_night_street" ||
            backgroundId === "bg_park_bench" ||
            backgroundId === "bg_bus_stop") && (
            <g>
              <line
                x1={width * 0.25}
                y1={height * 0.16}
                x2={width * 0.25}
                y2={floorY}
                stroke="#2C303A"
                strokeWidth={6}
              />
              <polygon
                points={`${width * 0.29},${height * 0.17} ${width * 0.12},${floorY} ${width * 0.48},${floorY}`}
                fill={bg.accentGlow}
                opacity={0.09}
              />
              <ellipse
                cx={width * 0.29}
                cy={height * 0.17}
                rx={14}
                ry={5}
                fill="#E0F2FE"
              />
            </g>
          )}

          {backgroundId === "bg_mind_void" && (
            <g>
              <circle
                cx={width * 0.5}
                cy={height * 0.44}
                r={Math.min(width, height) * 0.27}
                fill="none"
                stroke="#F04444"
                strokeWidth={1.5}
                strokeDasharray="8 6"
                opacity={0.35}
              />
              <ellipse
                cx={width * 0.5}
                cy={floorY}
                rx={width * 0.26}
                ry={14}
                fill="#F04444"
                opacity={0.1}
              />
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

          {/* Articulated 8-Part 2D Character Rigs */}
          {characters.map((item, idx) => {
            const { profile, action, expression, position } = item;
            const palette =
              profile?.color_palette || DEFAULT_CHARACTER_PALETTES.protagonist;
            const pose = getRigPoseForAction(action, timeInSceneSec + idx * 0.6);

            const cx =
              position === "left"
                ? width * 0.34
                : position === "right"
                ? width * 0.66
                : position === "background"
                ? width * 0.58
                : width * 0.5;

            const charScale =
              (position === "background"
                ? 0.76
                : position === "foreground"
                ? 1.12
                : 1.0) *
              (profile?.proportions?.height_scale || 1.0);

            const baseY = floorY - 122 * charScale + pose.torsoOffsetY * 0.42;

            // Mouth lip-sync animation when playing and subtitle exists
            const isSpeaking =
              isPlaying && Boolean(subtitleText && subtitleText.trim().length > 0);
            const lipOpen = isSpeaking
              ? 2 + Math.abs(Math.sin(timeInSceneSec * 11)) * 5
              : 0;

            return (
              <g
                key={`${profile?.id || idx}_${idx}`}
                transform={`translate(${cx}, ${baseY}) scale(${charScale})`}
              >
                {/* Ground Shadow */}
                <ellipse
                  cx={0}
                  cy={124}
                  rx={40}
                  ry={8}
                  fill="#000000"
                  opacity={0.6}
                />

                {/* Part 1: Left Leg */}
                <g transform={`translate(-12, 52) rotate(${pose.leftLegRotate})`}>
                  <rect
                    x={-6}
                    y={0}
                    width={12}
                    height={68}
                    rx={6}
                    fill={palette.fill}
                    stroke={palette.stroke}
                    strokeWidth={2}
                  />
                </g>

                {/* Part 2: Right Leg */}
                <g transform={`translate(12, 52) rotate(${pose.rightLegRotate})`}>
                  <rect
                    x={-6}
                    y={0}
                    width={12}
                    height={68}
                    rx={6}
                    fill={palette.fill}
                    stroke={palette.stroke}
                    strokeWidth={2}
                  />
                </g>

                {/* Part 3: Body / Torso */}
                <g transform={`rotate(${pose.torsoRotate})`}>
                  <rect
                    x={-24}
                    y={-22}
                    width={48}
                    height={80}
                    rx={22}
                    fill={palette.fill}
                    stroke={palette.stroke}
                    strokeWidth={2.4}
                  />

                  {/* Part 4: Left Arm */}
                  <g transform={`translate(-24, -12) rotate(${pose.leftArmRotate})`}>
                    <rect
                      x={-6}
                      y={0}
                      width={12}
                      height={56}
                      rx={6}
                      fill={palette.fill}
                      stroke={palette.stroke}
                      strokeWidth={2}
                    />
                  </g>

                  {/* Part 5: Right Arm + Optional Smartphone Prop */}
                  <g transform={`translate(24, -12) rotate(${pose.rightArmRotate})`}>
                    <rect
                      x={-6}
                      y={0}
                      width={12}
                      height={56}
                      rx={6}
                      fill={palette.fill}
                      stroke={palette.stroke}
                      strokeWidth={2}
                    />
                    {(pose.holdingPhone ||
                      action === "holding_phone" ||
                      action === "using_phone") && (
                      <g transform="translate(-4, 48)">
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
                          opacity={0.22}
                        />
                      </g>
                    )}
                  </g>

                  {/* Part 6: Head + Part 7: Eyes + Part 8: Mouth */}
                  <g
                    transform={`translate(0, ${-56 + pose.headOffsetY}) rotate(${pose.headRotate})`}
                  >
                    <circle
                      cx={0}
                      cy={0}
                      r={32}
                      fill={palette.fill}
                      stroke={palette.stroke}
                      strokeWidth={2.6}
                    />

                    {/* Eyebrows by Expression */}
                    {(expression === "sad" ||
                      expression === "crying" ||
                      expression === "worried") && (
                      <g
                        stroke={palette.shadow}
                        strokeWidth={2.2}
                        strokeLinecap="round"
                      >
                        <line x1={-16} y1={-9} x2={-6} y2={-13} />
                        <line x1={6} y1={-13} x2={16} y2={-9} />
                      </g>
                    )}
                    {expression === "angry" && (
                      <g
                        stroke={palette.shadow}
                        strokeWidth={2.6}
                        strokeLinecap="round"
                      >
                        <line x1={-16} y1={-13} x2={-6} y2={-8} />
                        <line x1={6} y1={-8} x2={16} y2={-13} />
                      </g>
                    )}

                    {/* Part 7: Eyes */}
                    {expression === "tired" ? (
                      <g
                        stroke={palette.shadow}
                        strokeWidth={2.4}
                        strokeLinecap="round"
                      >
                        <line x1={-15} y1={-3} x2={-7} y2={-3} />
                        <line x1={7} y1={-3} x2={15} y2={-3} />
                      </g>
                    ) : (
                      <g fill={palette.shadow}>
                        <circle
                          cx={-11}
                          cy={-3}
                          r={expression === "surprised" ? 4.2 : 3.2}
                        />
                        <circle
                          cx={11}
                          cy={-3}
                          r={expression === "surprised" ? 4.2 : 3.2}
                        />
                      </g>
                    )}

                    {/* Tears when crying */}
                    {expression === "crying" && (
                      <g
                        stroke="#38BDF8"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                      >
                        <line x1={-11} y1={2} x2={-11} y2={13} />
                        <line x1={11} y1={2} x2={11} y2={13} />
                      </g>
                    )}

                    {/* Part 8: Mouth (with live lip-sync support) */}
                    {lipOpen > 2.2 ? (
                      <rect
                        x={-6}
                        y={9}
                        width={12}
                        height={lipOpen}
                        rx={3}
                        fill={palette.shadow}
                      />
                    ) : expression === "happy" ? (
                      <path
                        d="M -8 9 Q 0 16 8 9"
                        fill="none"
                        stroke={palette.shadow}
                        strokeWidth={2.4}
                        strokeLinecap="round"
                      />
                    ) : expression === "sad" ||
                      expression === "crying" ||
                      expression === "worried" ? (
                      <path
                        d="M -8 14 Q 0 8 8 14"
                        fill="none"
                        stroke={palette.shadow}
                        strokeWidth={2.4}
                        strokeLinecap="round"
                      />
                    ) : expression === "surprised" ? (
                      <circle cx={0} cy={12} r={4.2} fill={palette.shadow} />
                    ) : (
                      <line
                        x1={-7}
                        y1={11}
                        x2={7}
                        y2={11}
                        stroke={palette.shadow}
                        strokeWidth={2.4}
                        strokeLinecap="round"
                      />
                    )}
                  </g>
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Dedicated Typography Subtitle Overlay (PRD Section 2.6: Chữ trên màn hình phải được render bằng hệ thống typography riêng) */}
      {!compact && subtitleText && (
        <div className="pointer-events-none absolute bottom-4 left-6 right-6 z-20 flex justify-center">
          <div className="max-w-2xl rounded-md bg-[#0B0B0D]/90 px-4 py-2 text-center text-sm font-medium text-[#F5F5F5] border border-[#292930] shadow-lg">
            {subtitleText}
          </div>
        </div>
      )}
    </div>
  );
};

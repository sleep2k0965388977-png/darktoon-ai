// ============================================================================
// DARKTOON AI — Real H.264 MP4 Video Compositor & FFmpeg Renderer
// (src/backend/services/videoRenderService.ts)
// ============================================================================

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";
import { DarktoonRepository } from "../repositories/darktoonRepository.ts";
import { QualityControlService } from "./qualityControlService.ts";
import { StorageService } from "../storage/storageService.ts";
import type {
  AspectRatio,
  CharacterProfile,
  RenderJob,
  Resolution,
  SceneRecord,
} from "../../types/darktoon.ts";
import {
  BACKGROUND_PRESETS,
  getRigPoseForAction,
} from "../animations/presets.ts";

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function getDimensions(
  aspectRatio: AspectRatio,
  resolution: Resolution
): { width: number; height: number } {
  const is1080 = resolution === "1080p";
  if (aspectRatio === "9:16") {
    return is1080 ? { width: 608, height: 1080 } : { width: 406, height: 720 };
  }
  if (aspectRatio === "1:1") {
    return is1080 ? { width: 720, height: 720 } : { width: 540, height: 540 };
  }
  return is1080 ? { width: 960, height: 540 } : { width: 640, height: 360 };
}

/**
 * Software 2D Canvas Rasterizer for PPM (P6) Video Frames.
 * Draws Dark Minimalist backgrounds, props, and articulated 8-part 2D Character Rigs
 * at timestamp `tSec` for direct encoding into H.264 MP4 via FFmpeg.
 */
function renderPpmFrame(params: {
  width: number;
  height: number;
  scene: SceneRecord;
  charactersById: Map<string, CharacterProfile>;
  timeInSceneSec: number;
}): Buffer {
  const { width, height, scene, charactersById, timeInSceneSec } = params;
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, "ascii");
  const pixels = Buffer.alloc(width * height * 3);

  const bgPreset =
    BACKGROUND_PRESETS[scene.background?.asset_id] ||
    BACKGROUND_PRESETS.bg_living_room;
  const [bgR, bgG, bgB] = hexToRgb(bgPreset.primaryColor);
  const [secR, secG, secB] = hexToRgb(bgPreset.secondaryColor);
  const [glowR, glowG, glowB] = hexToRgb(bgPreset.accentGlow);
  const floorY = Math.floor(height * 0.78);

  // Fill background with vertical dark gradient + horizon floor
  for (let y = 0; y < height; y++) {
    const isFloor = y >= floorY;
    const t = y / height;
    const r = isFloor ? 7 : Math.round(secR * (1 - t) + bgR * t);
    const g = isFloor ? 7 : Math.round(secG * (1 - t) + bgG * t);
    const b = isFloor ? 10 : Math.round(secB * (1 - t) + bgB * t);
    const rowStart = y * width * 3;
    for (let x = 0; x < width; x++) {
      const idx = rowStart + x * 3;
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
    }
  }

  const setPixel = (
    x: number,
    y: number,
    r: number,
    g: number,
    b: number,
    alpha: number = 1
  ) => {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= width || iy < 0 || iy >= height) return;
    const idx = (iy * width + ix) * 3;
    if (alpha >= 0.99) {
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
    } else {
      pixels[idx] = Math.round(pixels[idx] * (1 - alpha) + r * alpha);
      pixels[idx + 1] = Math.round(pixels[idx + 1] * (1 - alpha) + g * alpha);
      pixels[idx + 2] = Math.round(pixels[idx + 2] * (1 - alpha) + b * alpha);
    }
  };

  const fillRect = (
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    rgb: [number, number, number],
    alpha: number = 1
  ) => {
    const x0 = Math.max(0, Math.floor(rx));
    const y0 = Math.max(0, Math.floor(ry));
    const x1 = Math.min(width - 1, Math.ceil(rx + rw));
    const y1 = Math.min(height - 1, Math.ceil(ry + rh));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        setPixel(x, y, rgb[0], rgb[1], rgb[2], alpha);
      }
    }
  };

  const fillCircle = (
    cx: number,
    cy: number,
    radius: number,
    rgb: [number, number, number],
    alpha: number = 1
  ) => {
    const r2 = radius * radius;
    const x0 = Math.max(0, Math.floor(cx - radius));
    const y0 = Math.max(0, Math.floor(cy - radius));
    const x1 = Math.min(width - 1, Math.ceil(cx + radius));
    const y1 = Math.min(height - 1, Math.ceil(cy + radius));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          setPixel(x, y, rgb[0], rgb[1], rgb[2], alpha);
        }
      }
    }
  };

  const drawThickSegment = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
    rgb: [number, number, number]
  ) => {
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(x2 - x1, y2 - y1))
    );
    const rad = Math.max(1, thickness / 2);
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      fillCircle(x1 + (x2 - x1) * u, y1 + (y2 - y1) * u, rad, rgb);
    }
  };

  // Floor horizon line
  fillRect(0, floorY, width, 2, [42, 42, 52]);

  // Distinct Architectural & Environmental Rendering by Background Preset
  const bgId = scene.background?.asset_id || "bg_living_room";

  if (bgId === "bg_desk_workspace") {
    // 1. Desk Workspace: Warm amber lamp light cone, desk, laptop with glowing screen
    fillCircle(width * 0.72, height * 0.38, width * 0.24, [245, 158, 11], 0.15);
    // Desk tabletop
    fillRect(width * 0.26, floorY - 44, width * 0.48, 10, [32, 32, 44]);
    // Desk legs
    fillRect(width * 0.3, floorY - 34, 4, 34, [42, 42, 56]);
    fillRect(width * 0.7, floorY - 34, 4, 34, [42, 42, 56]);
    // Laptop
    fillRect(width * 0.45, floorY - 72, width * 0.1, 28, [15, 23, 42]);
    fillRect(width * 0.46, floorY - 69, width * 0.08, 22, [56, 189, 248], 0.55);
    // Desk lamp structure
    drawThickSegment(width * 0.74, floorY, width * 0.72, height * 0.34, 3, [100, 116, 139]);
    fillCircle(width * 0.72, height * 0.34, 10, [245, 158, 11], 0.85);
  } else if (bgId === "bg_bedroom") {
    // 2. Balcony / Window Autumn Night: Skyline buildings, crescent moon, balcony railing
    fillRect(width * 0.52, height * 0.2, width * 0.09, floorY - height * 0.2, [12, 16, 26]);
    fillRect(width * 0.63, height * 0.14, width * 0.11, floorY - height * 0.14, [15, 21, 36]);
    fillRect(width * 0.76, height * 0.24, width * 0.12, floorY - height * 0.24, [10, 14, 24]);
    // Tiny building lights
    fillRect(width * 0.66, height * 0.2, 4, 5, [254, 240, 138]);
    fillRect(width * 0.68, height * 0.27, 4, 5, [56, 189, 248]);
    // Crescent Moon
    fillCircle(width * 0.82, height * 0.12, 14, [254, 240, 138], 0.8);
    fillCircle(width * 0.8, height * 0.1, 12, [secR, secG, secB]);
    // Balcony Railing
    fillRect(width * 0.46, floorY - 45, width * 0.52, 4, [56, 56, 74]);
    for (let b = 0; b < 8; b++) {
      fillRect(width * 0.48 + b * (width * 0.065), floorY - 45, 2, 45, [44, 44, 58]);
    }
  } else if (bgId === "bg_night_street") {
    // 3. Night Street: Stately streetlamp with large golden light cone, sidewalk curb
    fillCircle(width * 0.28, height * 0.44, width * 0.26, [245, 158, 11], 0.18);
    // Cast iron post & arm
    drawThickSegment(width * 0.22, height * 0.16, width * 0.22, floorY, 6, [44, 48, 58]);
    drawThickSegment(width * 0.22, height * 0.22, width * 0.26, height * 0.16, 4, [44, 48, 58]);
    fillCircle(width * 0.26, height * 0.16, 12, [254, 243, 199]);
    // Sidewalk curb line
    fillRect(0, floorY + 14, width, 2, [36, 36, 46]);
  } else if (bgId === "bg_mind_void") {
    // 4. Mind Void: Ethereal red orbit ring and ground pool
    fillCircle(width * 0.5, floorY, width * 0.28, [240, 68, 68], 0.15);
    const ringRadius = height * 0.28;
    for (let a = 0; a < 360; a += 12) {
      const rad = (a * Math.PI) / 180;
      fillCircle(
        width * 0.5 + Math.cos(rad) * ringRadius,
        height * 0.42 + Math.sin(rad) * ringRadius,
        2.5,
        [240, 68, 68],
        0.55
      );
    }
  } else {
    // 5. Living Room / Cafe / Interior: Large window with traffic lights, sofa
    fillRect(width * 0.64, height * 0.14, width * 0.26, height * 0.36, [14, 20, 34]);
    fillRect(width * 0.77, height * 0.14, 2, height * 0.36, [38, 38, 52]);
    fillRect(width * 0.64, height * 0.32, width * 0.26, 2, [38, 38, 52]);
    fillCircle(width * 0.7 + Math.sin(timeInSceneSec * 2) * 16, height * 0.42, 3, [239, 68, 68]);
    fillCircle(width * 0.8 + Math.cos(timeInSceneSec * 2.2) * 18, height * 0.42, 3.5, [253, 224, 71]);
    // Sofa
    fillRect(width * 0.34, floorY - 42, width * 0.34, 42, [24, 24, 34]);
  }

  // Draw Additional Props
  for (const prop of scene.props) {
    if (prop.type === "sofa" && bgId !== "bg_living_room") {
      fillRect(
        width * 0.5 - width * 0.18,
        floorY - height * 0.12,
        width * 0.36,
        height * 0.11,
        [28, 28, 36]
      );
    }
  }

  // Camera shot framing & dynamic movement offset/zoom
  const camShot = scene.camera_direction?.shot || "medium";
  const baseScale =
    camShot === "extreme_close_up"
      ? 1.55
      : camShot === "close_up"
      ? 1.35
      : camShot === "wide"
      ? 0.86
      : 1.05;

  const camMove = scene.camera_direction?.movement || "slow_push_in";
  const camZoom =
    camMove === "slow_push_in"
      ? baseScale * (1 + Math.min(0.18, timeInSceneSec * 0.025))
      : camMove === "slow_pull_out"
      ? baseScale * Math.max(0.85, 1.12 - timeInSceneSec * 0.02)
      : baseScale;
  const camPanX =
    camMove === "pan_right"
      ? (timeInSceneSec - 2) * 9
      : camMove === "pan_left"
      ? -(timeInSceneSec - 2) * 9
      : camMove === "subtle_drift"
      ? Math.sin(timeInSceneSec * 1.2) * 6
      : 0;

  // Draw Articulated 8-Part 2D Character Rigs (Aesthetic Lofi Storyteller)
  scene.characters.forEach((scChar, idx) => {
    const profile = charactersById.get(scChar.character_id);
    const pose = getRigPoseForAction(scChar.action, timeInSceneSec + idx * 0.4);

    const isMain = !profile?.id || profile.id === "char_main" || idx === 0;
    const hoodieRgb: [number, number, number] = isMain ? [30, 32, 44] : [42, 45, 60];
    const pantsRgb: [number, number, number] = [18, 19, 26];
    const skinRgb: [number, number, number] = [253, 251, 247];
    const hairRgb: [number, number, number] = [20, 21, 32];
    const shadowRgb: [number, number, number] = [24, 25, 36];

    // Character horizontal walk translation across the frame
    const walkOffset =
      scChar.action === "walking"
        ? ((timeInSceneSec * 44) % (width * 0.44)) - (width * 0.16)
        : scChar.action === "running"
        ? ((timeInSceneSec * 88) % (width * 0.6)) - (width * 0.25)
        : 0;

    const baseX =
      (scChar.position === "left"
        ? width * 0.34
        : scChar.position === "right"
        ? width * 0.66
        : width * 0.5) + camPanX + walkOffset;
    const scale = (height / 480) * camZoom;
    const hipY = floorY - 62 * scale + pose.torsoOffsetY * 0.35 * scale;
    const shoulderY = hipY - 58 * scale;
    const headY = shoulderY - 34 * scale + pose.headOffsetY * 0.5 * scale;

    // Contact floor shadow
    fillCircle(baseX, floorY + 2 * scale, 34 * scale, [0, 0, 0], 0.6);

    // 1 & 2. Left & Right Legs (Dark Pants & Sneakers)
    const isSitting = scChar.action === "sitting" || pose.isSitting;
    const leftLegRad = ((isSitting ? 6 : pose.leftLegRotate) * Math.PI) / 180;
    const rightLegRad = ((isSitting ? -6 : pose.rightLegRotate) * Math.PI) / 180;
    const legLen = (isSitting ? 46 : 58) * scale;
    const leftFootX = baseX - 10 * scale - Math.sin(leftLegRad) * legLen;
    const leftFootY = hipY + Math.cos(leftLegRad) * legLen;
    const rightFootX = baseX + 10 * scale - Math.sin(rightLegRad) * legLen;
    const rightFootY = hipY + Math.cos(rightLegRad) * legLen;

    // Chair backrest when seated
    if (isSitting) {
      fillRect(baseX - 26 * scale, shoulderY - 10 * scale, 52 * scale, 54 * scale, [17, 18, 25]);
      fillRect(baseX - 16 * scale, shoulderY - 24 * scale, 32 * scale, 14 * scale, [17, 18, 25]);
    }

    drawThickSegment(baseX - 10 * scale, hipY, leftFootX, leftFootY, 11 * scale, pantsRgb);
    drawThickSegment(baseX + 10 * scale, hipY, rightFootX, rightFootY, 11 * scale, pantsRgb);
    // Sneakers
    fillRect(leftFootX - 6 * scale, leftFootY, 12 * scale, 4 * scale, [226, 232, 240]);
    fillRect(rightFootX - 6 * scale, rightFootY, 12 * scale, 4 * scale, [226, 232, 240]);

    // 3. Body / Torso (Oversized Hoodie)
    drawThickSegment(baseX, shoulderY, baseX, hipY, 36 * scale, hoodieRgb);
    // Hoodie pocket / fold
    fillRect(baseX - 12 * scale, hipY - 18 * scale, 24 * scale, 12 * scale, [42, 45, 62], 0.7);

    // 4 & 5. Left & Right Arms (Hoodie Sleeves + Skin Hands)
    const leftArmRad = ((isSitting ? 16 : pose.leftArmRotate) * Math.PI) / 180;
    const rightArmRad = ((isSitting ? -16 : pose.rightArmRotate) * Math.PI) / 180;
    const armLen = 46 * scale;
    const leftHandX = baseX - 18 * scale - Math.sin(leftArmRad) * armLen;
    const leftHandY = shoulderY + 6 * scale + Math.cos(leftArmRad) * armLen;
    const rightHandX = baseX + 18 * scale - Math.sin(rightArmRad) * armLen;
    const rightHandY = shoulderY + 6 * scale + Math.cos(rightArmRad) * armLen;

    drawThickSegment(baseX - 18 * scale, shoulderY + 6 * scale, leftHandX, leftHandY, 10 * scale, hoodieRgb);
    drawThickSegment(baseX + 18 * scale, shoulderY + 6 * scale, rightHandX, rightHandY, 10 * scale, hoodieRgb);
    fillCircle(leftHandX, leftHandY, 5 * scale, skinRgb);
    fillCircle(rightHandX, rightHandY, 5 * scale, skinRgb);

    if (pose.holdingPhone) {
      fillRect(
        rightHandX - 5 * scale,
        rightHandY - 8 * scale,
        10 * scale,
        16 * scale,
        [56, 189, 248]
      );
    }

    // 6. Hair Back Locks
    fillCircle(baseX - 14 * scale, headY - 8 * scale, 14 * scale, hairRgb);
    fillCircle(baseX + 14 * scale, headY - 8 * scale, 14 * scale, hairRgb);
    fillCircle(baseX, headY - 14 * scale, 18 * scale, hairRgb);

    // 7. Face (Anime Chin)
    fillCircle(baseX, headY, 24 * scale, skinRgb);
    fillCircle(baseX, headY + 5 * scale, 16 * scale, skinRgb);

    // 8. Hair Bangs Front & Headband
    fillRect(baseX - 22 * scale, headY - 26 * scale, 44 * scale, 14 * scale, hairRgb);
    fillCircle(baseX - 10 * scale, headY - 12 * scale, 8 * scale, hairRgb);
    fillCircle(baseX + 10 * scale, headY - 12 * scale, 8 * scale, hairRgb);
    // Headphones headband & earcups
    drawThickSegment(baseX - 24 * scale, headY, baseX + 24 * scale, headY - 18 * scale, 3 * scale, [71, 85, 105]);
    fillRect(baseX - 26 * scale, headY - 8 * scale, 5 * scale, 16 * scale, [30, 41, 59]);
    fillRect(baseX + 21 * scale, headY - 8 * scale, 5 * scale, 16 * scale, [30, 41, 59]);

    // Soft Cheeks Blush
    fillCircle(baseX - 12 * scale, headY + 5 * scale, 4.5 * scale, [251, 113, 133], 0.35);
    fillCircle(baseX + 12 * scale, headY + 5 * scale, 4.5 * scale, [251, 113, 133], 0.35);

    // 9. Expressive Anime Eyes with Iris & Catchlight
    fillCircle(baseX - 8 * scale, headY - 2 * scale, 4.5 * scale, [49, 46, 129]);
    fillCircle(baseX + 8 * scale, headY - 2 * scale, 4.5 * scale, [49, 46, 129]);
    fillCircle(baseX - 8 * scale, headY - 1 * scale, 2.5 * scale, [15, 23, 42]);
    fillCircle(baseX + 8 * scale, headY - 1 * scale, 2.5 * scale, [15, 23, 42]);
    // Specular eye catchlight sparkle
    fillCircle(baseX - 9.5 * scale, headY - 3.5 * scale, 1.4 * scale, [255, 255, 255]);
    fillCircle(baseX + 6.5 * scale, headY - 3.5 * scale, 1.4 * scale, [255, 255, 255]);

    // 10. Mouth (Animated lip-sync with pink tongue accent)
    const mouthOpen =
      Math.abs(Math.sin(timeInSceneSec * 10)) > 0.45 ? 4.5 * scale : 1.5 * scale;
    fillRect(
      baseX - 4.5 * scale,
      headY + 9 * scale,
      9 * scale,
      mouthOpen,
      shadowRgb
    );
    if (mouthOpen > 2 * scale) {
      fillRect(
        baseX - 2.5 * scale,
        headY + 11 * scale,
        5 * scale,
        2 * scale,
        [251, 113, 133]
      );
    }
  });

  // Subtitle lower-third bar when dialogue is active (split by short sentences)
  if (scene.transcript_text.trim().length > 0) {
    const sents = scene.transcript_text
      .split(/(?<=[.?!;])\s+|\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const sceneDuration = Math.max(0.5, scene.end_time - scene.start_time);
    let activeSentence = scene.transcript_text;
    let sentStartRatio = 0;
    let sentEndRatio = 1;

    if (sents.length > 1) {
      const totalChars = sents.reduce((acc, s) => acc + Math.max(12, s.length), 0);
      let elapsed = 0;
      for (let i = 0; i < sents.length; i++) {
        const dur = (Math.max(12, sents[i].length) / totalChars) * sceneDuration;
        if (timeInSceneSec <= elapsed + dur || i === sents.length - 1) {
          activeSentence = sents[i];
          sentStartRatio = elapsed / sceneDuration;
          sentEndRatio = (elapsed + dur) / sceneDuration;
          break;
        }
        elapsed += dur;
      }
    }

    // Dynamic clean pill width based on active short sentence length
    const barWidth = Math.min(width * 0.82, Math.max(width * 0.36, activeSentence.length * 8.5));
    const barX = (width - barWidth) / 2;
    const barY = height - Math.max(34, Math.floor(height * 0.095));
    const barH = Math.max(20, Math.floor(height * 0.055));

    fillRect(barX, barY, barWidth, barH, [11, 12, 17], 0.9);
    // Accent cyan sentence progress indicator
    const currentProgress = Math.min(
      1,
      Math.max(0, (timeInSceneSec / sceneDuration - sentStartRatio) / (sentEndRatio - sentStartRatio || 1))
    );
    fillRect(barX, barY + barH - 2, barWidth * currentProgress, 2, [56, 189, 248], 0.95);
  }

  return Buffer.concat([header, pixels]);
}

export class VideoRenderService {
  private static activeRenderProcesses = new Map<
    string,
    ReturnType<typeof spawn>
  >();

  static cancelRender(projectId: string): RenderJob | null {
    const latest = DarktoonRepository.getLatestRenderJob(projectId);
    const proc = this.activeRenderProcesses.get(projectId);
    if (proc) {
      try {
        proc.kill("SIGTERM");
      } catch {
        // ignore
      }
      this.activeRenderProcesses.delete(projectId);
    }
    if (latest && latest.status === "RUNNING") {
      return DarktoonRepository.updateRenderJob(latest.id, {
        status: "CANCELLED",
        error_message: "Người dùng đã hủy tiến trình render.",
      });
    }
    return latest;
  }

  /**
   * Runs Quality Control, synthesizes 2D animated frames per scene, and encodes
   * an H.264 + AAC .mp4 video synchronized to the master original audio track.
   */
  static async renderProjectVideo(
    projectId: string,
    options?: { forceRenderDespiteWarnings?: boolean }
  ): Promise<{
    renderJob: RenderJob;
    outputAssetId: string | null;
  }> {
    const project = DarktoonRepository.getProject(projectId);
    if (!project) {
      throw new Error("PROJECT_NOT_FOUND");
    }

    // Step 1: Run Quality Control (PRD 6.9)
    const qcReport = QualityControlService.validateProjectForRender(
      projectId,
      true
    );
    const renderJob = DarktoonRepository.createRenderJob(projectId, qcReport);

    if (!qcReport.passed && !options?.forceRenderDespiteWarnings) {
      const failedJob = DarktoonRepository.updateRenderJob(renderJob.id, {
        status: "FAILED",
        progress: 0,
        quality_report: qcReport,
        error_message:
          qcReport.issues.find((i) => i.severity === "error")?.message ||
          "Quality Control phát hiện cảnh lỗi cần review (NEEDS_REVIEW).",
      })!;
      return { renderJob: failedJob, outputAssetId: null };
    }

    DarktoonRepository.updateProject(projectId, { status: "RENDERING" });

    try {
      const scenes = DarktoonRepository.getScenesByProject(projectId);
      const characters = DarktoonRepository.getCharactersByProject(projectId);
      const charactersById = new Map(characters.map((c) => [c.id, c]));
      const audioAsset = DarktoonRepository.getProjectAudio(projectId);

      // Ensure master audio exists on disk
      let audioFilePath: string;
      const totalDuration =
        audioAsset?.duration ||
        (scenes.length > 0 ? scenes[scenes.length - 1].end_time : 12);

      if (audioAsset && StorageService.exists(audioAsset.storage_key)) {
        audioFilePath = StorageService.resolveAbsolutePath(
          audioAsset.storage_key
        );
      } else {
        const fallbackWav =
          StorageService.generateSynthesizedConversationWav(totalDuration);
        const tempAudioKey = StorageService.buildStorageKey(
          projectId,
          "audio",
          "master_sync.wav"
        );
        audioFilePath = StorageService.saveObject(tempAudioKey, fallbackWav);
      }

      const { width, height } = getDimensions(
        project.aspect_ratio,
        project.resolution
      );
      const fps = 10; // Smooth 10fps 2D storyboard animation for fast, reliable H.264 encoding
      const cappedDuration = Math.min(600, Math.max(2, totalDuration));
      const totalFrames = Math.max(10, Math.floor(cappedDuration * fps));

      const outputStorageKey = StorageService.buildStorageKey(
        projectId,
        "renders",
        `${project.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_${
          project.resolution
        }.mp4`
      );
      const outputFullPath =
        StorageService.resolveAbsolutePath(outputStorageKey);
      const outDir = path.dirname(outputFullPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      const ffmpegBin =
        ffmpegStatic ||
        path.join(
          process.cwd(),
          "node_modules",
          "ffmpeg-static",
          process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
        );

      DarktoonRepository.updateRenderJob(renderJob.id, { progress: 20 });

      await new Promise<void>((resolve, reject) => {
        const args = [
          "-y",
          "-f",
          "image2pipe",
          "-vcodec",
          "ppm",
          "-framerate",
          String(fps),
          "-i",
          "-",
          "-i",
          audioFilePath,
          "-t",
          String(cappedDuration),
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-shortest",
          outputFullPath,
        ];

        const child = spawn(ffmpegBin, args, {
          stdio: ["pipe", "ignore", "pipe"],
        });
        this.activeRenderProcesses.set(projectId, child);

        let stderrLog = "";
        child.stderr?.on("data", (chunk) => {
          stderrLog += String(chunk);
        });

        child.on("error", (err) => {
          this.activeRenderProcesses.delete(projectId);
          reject(err);
        });

        child.on("close", (code) => {
          this.activeRenderProcesses.delete(projectId);
          if (code === 0 && fs.existsSync(outputFullPath)) {
            resolve();
          } else {
            reject(
              new Error(
                `FFmpeg exited with code ${code}: ${stderrLog.slice(-400)}`
              )
            );
          }
        });

        // Write synthesized 2D rig frames sequentially into FFmpeg stdin
        for (let f = 0; f < totalFrames; f++) {
          const currentSec = f / fps;
          const activeScene =
            scenes.find(
              (s) => currentSec >= s.start_time && currentSec <= s.end_time
            ) ||
            scenes[Math.min(scenes.length - 1, Math.floor((f / totalFrames) * scenes.length))] ||
            scenes[0];

          const timeInScene = Math.max(
            0,
            currentSec - (activeScene?.start_time || 0)
          );
          const frameBuffer = renderPpmFrame({
            width,
            height,
            scene: activeScene,
            charactersById,
            timeInSceneSec: timeInScene,
          });
          child.stdin?.write(frameBuffer);

          if (f % Math.max(1, Math.floor(totalFrames / 5)) === 0) {
            const pct = Math.min(90, 25 + Math.round((f / totalFrames) * 65));
            DarktoonRepository.updateRenderJob(renderJob.id, { progress: pct });
          }
        }
        child.stdin?.end();
      });

      const stat = fs.statSync(outputFullPath);
      const outputAsset = DarktoonRepository.createAsset({
        project_id: projectId,
        asset_type: "rendered_video",
        storage_key: outputStorageKey,
        provider: "ffmpeg-hybrid-compositor",
        model: "libx264-aac",
        prompt: `Final MP4 export (${project.aspect_ratio}, ${project.resolution})`,
        width,
        height,
        duration: cappedDuration,
        metadata: {
          file_size: stat.size,
          aspect_ratio: project.aspect_ratio,
          resolution: project.resolution,
          fps,
        },
        is_mock: false,
        status: "COMPLETED",
      });

      const completedRenderJob = DarktoonRepository.updateRenderJob(
        renderJob.id,
        {
          status: "COMPLETED",
          progress: 100,
          output_asset_id: outputAsset.id,
          quality_report: qcReport,
        }
      )!;

      DarktoonRepository.updateProject(projectId, { status: "COMPLETED" });
      return {
        renderJob: completedRenderJob,
        outputAssetId: outputAsset.id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const failedRenderJob = DarktoonRepository.updateRenderJob(renderJob.id, {
        status: "FAILED",
        error_message: message,
      })!;
      DarktoonRepository.updateProject(projectId, { status: "FAILED" });
      return { renderJob: failedRenderJob, outputAssetId: null };
    }
  }
}

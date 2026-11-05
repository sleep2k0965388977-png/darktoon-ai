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

  // Subtle atmospheric spotlight / window glow
  fillCircle(width * 0.72, height * 0.28, height * 0.18, [glowR, glowG, glowB], 0.14);

  // Draw Props (Sofa / Desk / Window)
  for (const prop of scene.props) {
    if (prop.type === "sofa" || prop.type === "bench") {
      fillRect(
        width * 0.5 - width * 0.18,
        floorY - height * 0.12,
        width * 0.36,
        height * 0.11,
        [28, 28, 36]
      );
    } else if (prop.type === "window") {
      fillRect(
        width * 0.68,
        height * 0.15,
        width * 0.14,
        height * 0.28,
        [18, 26, 42]
      );
    }
  }

  // Camera movement offset/zoom
  const camMove = scene.camera_direction?.movement || "slow_push_in";
  const camZoom =
    camMove === "slow_push_in"
      ? 1 + Math.min(0.18, timeInSceneSec * 0.025)
      : camMove === "slow_pull_out"
      ? Math.max(0.85, 1.12 - timeInSceneSec * 0.02)
      : 1.0;
  const camPanX =
    camMove === "pan_right"
      ? (timeInSceneSec - 2) * 8
      : camMove === "pan_left"
      ? -(timeInSceneSec - 2) * 8
      : 0;

  // Draw Articulated 8-Part 2D Character Rigs
  scene.characters.forEach((scChar, idx) => {
    const profile = charactersById.get(scChar.character_id);
    const fillRgb = hexToRgb(profile?.color_palette?.fill || "#F4F1EA");
    const shadowRgb = hexToRgb(profile?.color_palette?.shadow || "#18181D");
    const pose = getRigPoseForAction(scChar.action, timeInSceneSec + idx * 0.4);

    const baseX =
      (scChar.position === "left"
        ? width * 0.34
        : scChar.position === "right"
        ? width * 0.66
        : width * 0.5) + camPanX;
    const scale = (height / 480) * camZoom;
    const hipY = floorY - 62 * scale + pose.torsoOffsetY * 0.35 * scale;
    const shoulderY = hipY - 58 * scale;
    const headY = shoulderY - 34 * scale + pose.headOffsetY * 0.5 * scale;

    // 1 & 2. Left & Right Legs
    const leftLegRad = (pose.leftLegRotate * Math.PI) / 180;
    const rightLegRad = (pose.rightLegRotate * Math.PI) / 180;
    const legLen = 58 * scale;
    drawThickSegment(
      baseX - 10 * scale,
      hipY,
      baseX - 10 * scale - Math.sin(leftLegRad) * legLen,
      hipY + Math.cos(leftLegRad) * legLen,
      10 * scale,
      fillRgb
    );
    drawThickSegment(
      baseX + 10 * scale,
      hipY,
      baseX + 10 * scale - Math.sin(rightLegRad) * legLen,
      hipY + Math.cos(rightLegRad) * legLen,
      10 * scale,
      fillRgb
    );

    // 3. Body / Torso
    drawThickSegment(baseX, shoulderY, baseX, hipY, 34 * scale, fillRgb);

    // 4 & 5. Left & Right Arms
    const leftArmRad = (pose.leftArmRotate * Math.PI) / 180;
    const rightArmRad = (pose.rightArmRotate * Math.PI) / 180;
    const armLen = 48 * scale;
    drawThickSegment(
      baseX - 18 * scale,
      shoulderY + 6 * scale,
      baseX - 18 * scale - Math.sin(leftArmRad) * armLen,
      shoulderY + 6 * scale + Math.cos(leftArmRad) * armLen,
      9 * scale,
      fillRgb
    );
    const rightHandX = baseX + 18 * scale - Math.sin(rightArmRad) * armLen;
    const rightHandY = shoulderY + 6 * scale + Math.cos(rightArmRad) * armLen;
    drawThickSegment(
      baseX + 18 * scale,
      shoulderY + 6 * scale,
      rightHandX,
      rightHandY,
      9 * scale,
      fillRgb
    );

    if (pose.holdingPhone) {
      fillRect(
        rightHandX - 5 * scale,
        rightHandY - 8 * scale,
        10 * scale,
        16 * scale,
        [56, 189, 248]
      );
    }

    // 6. Rounded Head
    fillCircle(baseX, headY, 26 * scale, fillRgb);

    // 7. Eyes
    fillCircle(baseX - 8 * scale, headY - 3 * scale, 2.8 * scale, shadowRgb);
    fillCircle(baseX + 8 * scale, headY - 3 * scale, 2.8 * scale, shadowRgb);

    // 8. Mouth (Animated lip-sync when speaking)
    const mouthOpen =
      Math.abs(Math.sin(timeInSceneSec * 9.5)) > 0.55 ? 3.5 * scale : 1.5 * scale;
    fillRect(
      baseX - 5 * scale,
      headY + 8 * scale,
      10 * scale,
      mouthOpen,
      shadowRgb
    );
  });

  // Subtitle lower-third bar when dialogue is active
  if (scene.transcript_text.trim().length > 0) {
    fillRect(
      width * 0.14,
      height - Math.max(36, Math.floor(height * 0.11)),
      width * 0.72,
      Math.max(22, Math.floor(height * 0.065)),
      [15, 15, 20],
      0.82
    );
    // Accent red progress indicator along bottom of subtitle bar
    const sceneDuration = Math.max(0.5, scene.end_time - scene.start_time);
    const progressRatio = Math.min(1, Math.max(0, timeInSceneSec / sceneDuration));
    fillRect(
      width * 0.14,
      height - Math.max(36, Math.floor(height * 0.11)),
      width * 0.72 * progressRatio,
      2,
      [240, 68, 68],
      0.95
    );
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
      const cappedDuration = Math.min(36, Math.max(4, totalDuration));
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

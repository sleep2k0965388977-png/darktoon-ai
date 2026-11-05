// ============================================================================
// DARKTOON AI — Authentication, Authorization & Demo Seed Initializer
// (src/backend/services/authHelper.ts)
// ============================================================================

import { DarktoonRepository } from "../repositories/darktoonRepository.ts";
import { PipelineOrchestratorService } from "./pipelineOrchestratorService.ts";
import { StorageService } from "../storage/storageService.ts";
import type { User } from "../../types/darktoon.ts";

let demoSeeded = false;

export async function ensureInitialSeedData(): Promise<User> {
  const defaultUser = DarktoonRepository.getOrCreateDefaultUser();
  if (demoSeeded) return defaultUser;
  demoSeeded = true;

  const existingProjects = DarktoonRepository.listProjects(defaultUser.id);
  if (existingProjects.length === 0) {
    // Seed a complete showcase project using explicit Development Mock mode ([MOCK])
    const demoProject = DarktoonRepository.createProject({
      user_id: defaultUser.id,
      name: "Đêm Khuya & Chiếc Điện Thoại (Dark Minimalist Story)",
      description:
        "Dự án mẫu tự sự đêm khuya: Nhân vật chính ngồi một mình trong phòng tối, mở điện thoại nhiều lần nhưng không nhắn cho ai, rồi đứng bên cửa sổ nhìn ánh đèn thành phố.",
      aspect_ratio: "16:9",
      resolution: "1080p",
      fps: 24,
      style_id: "DARK_MINIMALIST_2D",
      language: "vi",
      budget_limit_usd: 15.0,
    });

    const wavBuffer = StorageService.generateSynthesizedConversationWav(24);
    const storageKey = StorageService.buildStorageKey(
      demoProject.id,
      "audio",
      "dem_khuya_hoi_thoai.wav"
    );
    StorageService.saveObject(storageKey, wavBuffer);
    const waveform = StorageService.extractWaveformPeaks(wavBuffer, 96);

    DarktoonRepository.createAudioAsset({
      project_id: demoProject.id,
      file_name: "dem_khuya_hoi_thoai.wav",
      storage_key: storageKey,
      format: "wav",
      duration: 24,
      sample_rate: 22050,
      channels: 1,
      file_size: wavBuffer.length,
      waveform,
    });

    await PipelineOrchestratorService.analyzeProjectAudio({
      projectId: demoProject.id,
      providerOverride: "mock",
    });

    await PipelineOrchestratorService.generateProjectStoryboard({
      projectId: demoProject.id,
      providerOverride: "mock",
    });
  }

  return defaultUser;
}

export async function getRequestUser(req: {
  headers: Headers;
  cookies?: { get(name: string): { value: string } | undefined };
}): Promise<User> {
  await ensureInitialSeedData();
  const headerUserId =
    req.headers.get("x-user-id") ||
    req.cookies?.get("darktoon_user_id")?.value;
  if (headerUserId) {
    const found = DarktoonRepository.getUserById(headerUserId);
    if (found) return found;
  }
  return DarktoonRepository.getOrCreateDefaultUser();
}

export function assertProjectOwnership(
  projectId: string,
  userId: string
): void {
  const project = DarktoonRepository.getProject(projectId);
  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }
  if (project.user_id !== userId) {
    throw new Error("FORBIDDEN_PROJECT_ACCESS");
  }
}

export function apiErrorResponse(err: unknown, defaultStatus: number = 400) {
  const message = err instanceof Error ? err.message : String(err);
  const status = message.includes("NOT_FOUND")
    ? 404
    : message.includes("FORBIDDEN")
    ? 403
    : message.includes("PROVIDER_NOT_CONFIGURED")
    ? 422
    : defaultStatus;

  return Response.json(
    {
      error: {
        code: message.split(":")[0] || "API_ERROR",
        message,
      },
    },
    { status }
  );
}

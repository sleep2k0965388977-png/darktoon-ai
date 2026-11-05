import { NextRequest, NextResponse } from "next/server";
import { DarktoonRepository } from "@/backend/repositories/darktoonRepository";
import {
  apiErrorResponse,
  assertProjectOwnership,
  getRequestUser,
} from "@/backend/services/authHelper";
import { PipelineOrchestratorService } from "@/backend/services/pipelineOrchestratorService";
import { AnimationMethod } from "@/types/darktoon";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ sceneId: string }> }
) {
  try {
    const user = await getRequestUser(req);
    const { sceneId } = await context.params;
    const existing = DarktoonRepository.getSceneById(sceneId);
    if (!existing) {
      return NextResponse.json(
        { error: { code: "SCENE_NOT_FOUND", message: "Không tìm thấy cảnh." } },
        { status: 404 }
      );
    }
    assertProjectOwnership(existing.project_id, user.id);

    let body: {
      method?: AnimationMethod;
      motion_prompt?: string;
      provider?: "openai" | "gemini" | "replicate" | "mock";
    } = {};
    try {
      body = await req.json();
    } catch {
      // optional body
    }

    const result = await PipelineOrchestratorService.regenerateSceneAnimation({
      sceneId,
      methodOverride: body.method,
      motionPromptOverride: body.motion_prompt,
      providerOverride: body.provider,
    });
    return NextResponse.json(result);
  } catch (err) {
    return apiErrorResponse(err);
  }
}

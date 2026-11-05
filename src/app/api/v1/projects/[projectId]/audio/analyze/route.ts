import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorResponse,
  assertProjectOwnership,
  getRequestUser,
} from "@/backend/services/authHelper";
import { PipelineOrchestratorService } from "@/backend/services/pipelineOrchestratorService";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getRequestUser(req);
    const { projectId } = await context.params;
    assertProjectOwnership(projectId, user.id);

    let body: {
      provider?: "openai" | "gemini" | "mock";
      custom_transcript_hint?: string;
    } = {};
    try {
      body = await req.json();
    } catch {
      // empty body is valid
    }

    const result = await PipelineOrchestratorService.analyzeProjectAudio({
      projectId,
      providerOverride: body.provider,
      customTranscriptHint: body.custom_transcript_hint,
    });

    return NextResponse.json(result);
  } catch (err) {
    return apiErrorResponse(err);
  }
}

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

    let body: { provider?: "openai" | "gemini" | "mock" } = {};
    try {
      body = await req.json();
    } catch {
      // optional body
    }

    const result = await PipelineOrchestratorService.generateProjectStoryboard({
      projectId,
      providerOverride: body.provider,
    });
    return NextResponse.json(result);
  } catch (err) {
    return apiErrorResponse(err);
  }
}

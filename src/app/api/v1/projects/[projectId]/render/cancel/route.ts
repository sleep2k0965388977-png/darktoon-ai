import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorResponse,
  assertProjectOwnership,
  getRequestUser,
} from "@/backend/services/authHelper";
import { VideoRenderService } from "@/backend/services/videoRenderService";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getRequestUser(req);
    const { projectId } = await context.params;
    assertProjectOwnership(projectId, user.id);

    const renderJob = VideoRenderService.cancelRender(projectId);
    return NextResponse.json({ render_job: renderJob });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

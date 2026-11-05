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

    let body: { force?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // optional
    }

    const result = await VideoRenderService.renderProjectVideo(projectId, {
      forceRenderDespiteWarnings: Boolean(body.force),
    });

    return NextResponse.json({
      render_job: result.renderJob,
      output_asset_id: result.outputAssetId,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { DarktoonRepository } from "@/backend/repositories/darktoonRepository";
import {
  apiErrorResponse,
  assertProjectOwnership,
  getRequestUser,
} from "@/backend/services/authHelper";
import { QualityControlService } from "@/backend/services/qualityControlService";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getRequestUser(req);
    const { projectId } = await context.params;
    assertProjectOwnership(projectId, user.id);

    const renderJob = DarktoonRepository.getLatestRenderJob(projectId);
    const qcReport = QualityControlService.validateProjectForRender(
      projectId,
      false
    );
    return NextResponse.json({
      render_job: renderJob,
      quality_report: qcReport,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

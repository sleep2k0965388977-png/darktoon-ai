import { NextRequest, NextResponse } from "next/server";
import { DarktoonRepository } from "@/backend/repositories/darktoonRepository";
import {
  apiErrorResponse,
  assertProjectOwnership,
  getRequestUser,
} from "@/backend/services/authHelper";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getRequestUser(req);
    const { jobId } = await context.params;
    const job = DarktoonRepository.getJobById(jobId);
    if (!job) {
      return NextResponse.json(
        { error: { code: "JOB_NOT_FOUND", message: "Không tìm thấy job." } },
        { status: 404 }
      );
    }
    assertProjectOwnership(job.project_id, user.id);
    return NextResponse.json({ job });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { DarktoonRepository } from "@/backend/repositories/darktoonRepository";
import {
  apiErrorResponse,
  assertProjectOwnership,
  getRequestUser,
} from "@/backend/services/authHelper";
import { PipelineOrchestratorService } from "@/backend/services/pipelineOrchestratorService";

export async function POST(
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

    DarktoonRepository.updateJob(jobId, {
      status: "RUNNING",
      retry_count: job.retry_count + 1,
      error_message: null,
    });

    if (job.job_type === "ASR_TRANSCRIBE") {
      await PipelineOrchestratorService.analyzeProjectAudio({
        projectId: job.project_id,
        providerOverride: job.provider === "mock" ? "mock" : undefined,
      });
    } else if (job.job_type === "STORYBOARD_GENERATE") {
      await PipelineOrchestratorService.generateProjectStoryboard({
        projectId: job.project_id,
        providerOverride: job.provider === "mock" ? "mock" : undefined,
      });
    }

    const updated = DarktoonRepository.updateJob(jobId, {
      status: "COMPLETED",
    });
    return NextResponse.json({ job: updated });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

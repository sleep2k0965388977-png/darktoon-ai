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

    const project = DarktoonRepository.getProject(projectId)!;
    const audio = DarktoonRepository.getProjectAudio(projectId);
    const transcript = DarktoonRepository.getTranscriptByProject(projectId);
    const speakers = DarktoonRepository.getSpeakersByProject(projectId);
    const characters = DarktoonRepository.getCharactersByProject(projectId);
    const scenes = DarktoonRepository.getScenesByProject(projectId);
    const timeline = DarktoonRepository.getTimelineByProject(projectId);
    const assets = DarktoonRepository.getAssetsByProject(projectId);
    const jobs = DarktoonRepository.getJobsByProject(projectId);
    const latestRender = DarktoonRepository.getLatestRenderJob(projectId);
    const costs = DarktoonRepository.getProjectCosts(projectId);
    const qcReport = QualityControlService.validateProjectForRender(
      projectId,
      false
    );

    return NextResponse.json({
      project,
      audio,
      transcript,
      speakers,
      characters,
      scenes,
      timeline,
      assets,
      jobs,
      latest_render: latestRender,
      costs,
      quality_report: qcReport,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getRequestUser(req);
    const { projectId } = await context.params;
    assertProjectOwnership(projectId, user.id);

    const body = await req.json();
    const updated = DarktoonRepository.updateProject(projectId, body);
    return NextResponse.json({ project: updated });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getRequestUser(req);
    const { projectId } = await context.params;
    assertProjectOwnership(projectId, user.id);

    DarktoonRepository.softDeleteProject(projectId);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { DarktoonRepository } from "@/backend/repositories/darktoonRepository";
import {
  apiErrorResponse,
  assertProjectOwnership,
  getRequestUser,
} from "@/backend/services/authHelper";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getRequestUser(req);
    const { projectId } = await context.params;
    assertProjectOwnership(projectId, user.id);

    const transcript = DarktoonRepository.getTranscriptByProject(projectId);
    const speakers = DarktoonRepository.getSpeakersByProject(projectId);
    return NextResponse.json({ transcript, speakers });
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
    if (Array.isArray(body.segments)) {
      DarktoonRepository.updateTranscriptSegments(projectId, body.segments);
    }
    const transcript = DarktoonRepository.getTranscriptByProject(projectId);
    const speakers = DarktoonRepository.getSpeakersByProject(projectId);
    return NextResponse.json({ transcript, speakers });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

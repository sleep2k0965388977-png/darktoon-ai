import { NextRequest, NextResponse } from "next/server";
import { DarktoonRepository } from "@/backend/repositories/darktoonRepository";
import {
  apiErrorResponse,
  assertProjectOwnership,
  getRequestUser,
} from "@/backend/services/authHelper";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getRequestUser(req);
    const { projectId } = await context.params;
    assertProjectOwnership(projectId, user.id);

    const body = await req.json();
    if (body.track_id) {
      DarktoonRepository.updateTimelineTrack(body.track_id, {
        muted: body.muted,
        volume: body.volume,
      });
    }
    const timeline = DarktoonRepository.getTimelineByProject(projectId);
    return NextResponse.json({ timeline });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

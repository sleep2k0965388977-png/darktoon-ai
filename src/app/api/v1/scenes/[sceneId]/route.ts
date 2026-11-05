import { NextRequest, NextResponse } from "next/server";
import { DarktoonRepository } from "@/backend/repositories/darktoonRepository";
import {
  apiErrorResponse,
  assertProjectOwnership,
  getRequestUser,
} from "@/backend/services/authHelper";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ sceneId: string }> }
) {
  try {
    const user = await getRequestUser(req);
    const { sceneId } = await context.params;
    const scene = DarktoonRepository.getSceneById(sceneId);
    if (!scene) {
      return NextResponse.json(
        { error: { code: "SCENE_NOT_FOUND", message: "Không tìm thấy cảnh." } },
        { status: 404 }
      );
    }
    assertProjectOwnership(scene.project_id, user.id);
    return NextResponse.json({ scene });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ sceneId: string }> }
) {
  try {
    const user = await getRequestUser(req);
    const { sceneId } = await context.params;
    const existing = DarktoonRepository.getSceneById(sceneId);
    if (!existing) {
      return NextResponse.json(
        { error: { code: "SCENE_NOT_FOUND", message: "Không tìm thấy cảnh." } },
        { status: 404 }
      );
    }
    assertProjectOwnership(existing.project_id, user.id);

    const body = await req.json();
    const updated = DarktoonRepository.updateScene(sceneId, body);
    return NextResponse.json({ scene: updated });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

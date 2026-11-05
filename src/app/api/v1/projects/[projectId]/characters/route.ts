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

    const characters = DarktoonRepository.getCharactersByProject(projectId);
    return NextResponse.json({ characters });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getRequestUser(req);
    const { projectId } = await context.params;
    assertProjectOwnership(projectId, user.id);

    const body = await req.json();
    if (!body.name) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Tên nhân vật là bắt buộc." } },
        { status: 400 }
      );
    }
    const character = DarktoonRepository.createCharacter({
      project_id: projectId,
      name: body.name,
      role: body.role,
      design_description: body.design_description,
      color_palette: body.color_palette,
      proportions: body.proportions,
      layers: body.layers,
      locked: Boolean(body.locked),
    });
    return NextResponse.json({ character }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { DarktoonRepository } from "@/backend/repositories/darktoonRepository";
import {
  apiErrorResponse,
  assertProjectOwnership,
  getRequestUser,
} from "@/backend/services/authHelper";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ characterId: string }> }
) {
  try {
    const user = await getRequestUser(req);
    const { characterId } = await context.params;
    const existing = DarktoonRepository.getCharacterById(characterId);
    if (!existing) {
      return NextResponse.json(
        { error: { code: "CHARACTER_NOT_FOUND", message: "Không tìm thấy nhân vật." } },
        { status: 404 }
      );
    }
    assertProjectOwnership(existing.project_id, user.id);

    const body = await req.json();
    const character = DarktoonRepository.updateCharacter(characterId, body);
    return NextResponse.json({ character });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

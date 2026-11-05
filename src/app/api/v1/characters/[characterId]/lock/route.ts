import { NextRequest, NextResponse } from "next/server";
import { DarktoonRepository } from "@/backend/repositories/darktoonRepository";
import {
  apiErrorResponse,
  assertProjectOwnership,
  getRequestUser,
} from "@/backend/services/authHelper";

export async function POST(
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

    let locked = !existing.locked;
    try {
      const body = await req.json();
      if (typeof body.locked === "boolean") {
        locked = body.locked;
      }
    } catch {
      // toggle if no body
    }

    const character = DarktoonRepository.updateCharacter(characterId, {
      locked,
    });
    return NextResponse.json({ character });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

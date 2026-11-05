import { NextRequest, NextResponse } from "next/server";
import { DarktoonRepository } from "@/backend/repositories/darktoonRepository";
import { ProviderRegistry } from "@/backend/providers/providerRegistry";
import {
  apiErrorResponse,
  assertProjectOwnership,
  getRequestUser,
} from "@/backend/services/authHelper";
import { StorageService } from "@/backend/storage/storageService";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ characterId: string }> }
) {
  try {
    const user = await getRequestUser(req);
    const { characterId } = await context.params;
    const character = DarktoonRepository.getCharacterById(characterId);
    if (!character) {
      return NextResponse.json(
        { error: { code: "CHARACTER_NOT_FOUND", message: "Không tìm thấy nhân vật." } },
        { status: 404 }
      );
    }
    assertProjectOwnership(character.project_id, user.id);

    let body: { provider?: "openai" | "gemini" | "mock" } = {};
    try {
      body = await req.json();
    } catch {
      // optional
    }

    const imageProvider = ProviderRegistry.getImage(body.provider);
    const refImg = await imageProvider.generateCharacterReference({
      character,
      width: 1280,
      height: 720,
    });
    const key = StorageService.buildStorageKey(
      character.project_id,
      "characters",
      `${character.id}_ref.svg`
    );
    StorageService.saveObject(key, refImg.data);

    const asset = DarktoonRepository.createAsset({
      project_id: character.project_id,
      asset_type: "character_reference",
      storage_key: key,
      provider: refImg.provider,
      model: refImg.model,
      prompt: `Character Reference Sheet for ${character.name}`,
      width: 1280,
      height: 720,
      is_mock: refImg.is_mock,
    });

    const wasLocked = character.locked;
    if (wasLocked) {
      DarktoonRepository.updateCharacter(characterId, { locked: false });
    }
    const updated = DarktoonRepository.updateCharacter(characterId, {
      reference_asset_id: asset.id,
      locked: wasLocked,
    });

    return NextResponse.json({ character: updated, asset });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

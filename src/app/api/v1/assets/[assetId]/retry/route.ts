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
  context: { params: Promise<{ assetId: string }> }
) {
  try {
    const user = await getRequestUser(req);
    const { assetId } = await context.params;
    const asset = DarktoonRepository.getAssetById(assetId);
    if (!asset) {
      return NextResponse.json(
        { error: { code: "ASSET_NOT_FOUND", message: "Không tìm thấy asset." } },
        { status: 404 }
      );
    }
    assertProjectOwnership(asset.project_id, user.id);

    if (asset.scene_id) {
      const res = await PipelineOrchestratorService.regenerateSceneImage({
        sceneId: asset.scene_id,
        providerOverride: asset.is_mock ? "mock" : undefined,
      });
      return NextResponse.json({ asset: res.newAsset, scene: res.scene });
    }

    return NextResponse.json({ asset });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

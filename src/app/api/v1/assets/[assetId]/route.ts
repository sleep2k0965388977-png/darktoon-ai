import { NextRequest, NextResponse } from "next/server";
import { DarktoonRepository } from "@/backend/repositories/darktoonRepository";
import {
  apiErrorResponse,
  assertProjectOwnership,
  getRequestUser,
} from "@/backend/services/authHelper";
import { StorageService } from "@/backend/storage/storageService";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ assetId: string }> }
) {
  try {
    const user = await getRequestUser(req);
    const { assetId } = await context.params;
    const asset = DarktoonRepository.getAssetById(assetId);
    if (!asset) {
      return NextResponse.json(
        { error: { code: "ASSET_NOT_FOUND", message: "Không tìm thấy tài nguyên." } },
        { status: 404 }
      );
    }
    assertProjectOwnership(asset.project_id, user.id);

    const raw = req.nextUrl.searchParams.get("raw") === "1";
    if (raw) {
      if (!StorageService.exists(asset.storage_key)) {
        return NextResponse.json(
          { error: { code: "FILE_MISSING", message: "File vật lý không tồn tại." } },
          { status: 404 }
        );
      }
      const buf = StorageService.readObject(asset.storage_key);
      const isSvg = asset.storage_key.endsWith(".svg");
      const isMp4 = asset.storage_key.endsWith(".mp4");
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": isSvg
            ? "image/svg+xml"
            : isMp4
            ? "video/mp4"
            : "application/octet-stream",
          "Content-Length": String(buf.length),
        },
      });
    }

    return NextResponse.json({ asset });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

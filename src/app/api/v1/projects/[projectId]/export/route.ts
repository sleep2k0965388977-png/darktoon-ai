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
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getRequestUser(req);
    const { projectId } = await context.params;
    assertProjectOwnership(projectId, user.id);

    const latestRender = DarktoonRepository.getLatestRenderJob(projectId);
    if (!latestRender || !latestRender.output_asset_id) {
      return NextResponse.json(
        {
          error: {
            code: "RENDER_NOT_READY",
            message: "Dự án chưa có file MP4 đã render. Hãy chạy Render trước.",
          },
        },
        { status: 404 }
      );
    }

    const asset = DarktoonRepository.getAssetById(latestRender.output_asset_id);
    if (!asset || !StorageService.exists(asset.storage_key)) {
      return NextResponse.json(
        { error: { code: "EXPORT_FILE_MISSING", message: "Không tìm thấy file MP4." } },
        { status: 404 }
      );
    }

    const download = req.nextUrl.searchParams.get("download") === "1";
    if (download) {
      const buf = StorageService.readObject(asset.storage_key);
      const fileName = asset.storage_key.split("/").pop() || "darktoon_export.mp4";
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": String(buf.length),
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    return NextResponse.json({
      render_job: latestRender,
      output_asset: asset,
      download_url: `/api/v1/projects/${projectId}/export?download=1`,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

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

    const audio = DarktoonRepository.getProjectAudio(projectId);
    if (!audio) {
      return NextResponse.json({ audio: null });
    }

    const streamRaw = req.nextUrl.searchParams.get("stream") === "1";
    if (streamRaw) {
      const buf = StorageService.exists(audio.storage_key)
        ? StorageService.readObject(audio.storage_key)
        : StorageService.generateSynthesizedConversationWav(audio.duration);
      const mimeMap: Record<string, string> = {
        wav: "audio/wav",
        mp3: "audio/mpeg",
        m4a: "audio/mp4",
        aac: "audio/aac",
        flac: "audio/flac",
      };
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": mimeMap[audio.format] || "audio/wav",
          "Content-Length": String(buf.length),
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({ audio });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

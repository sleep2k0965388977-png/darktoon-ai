import { NextRequest, NextResponse } from "next/server";
import { DarktoonRepository } from "@/backend/repositories/darktoonRepository";
import {
  apiErrorResponse,
  assertProjectOwnership,
  getRequestUser,
} from "@/backend/services/authHelper";
import { StorageService } from "@/backend/storage/storageService";

const ALLOWED_EXTENSIONS = ["mp3", "wav", "m4a", "aac", "flac"];

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getRequestUser(req);
    const { projectId } = await context.params;
    assertProjectOwnership(projectId, user.id);

    const contentType = req.headers.get("content-type") || "";
    let fileName = "dialogue.wav";
    let buffer: Buffer;
    let durationSec = 24;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const customDuration = Number(formData.get("duration") || 0);
      if (!file) {
        return NextResponse.json(
          { error: { code: "NO_FILE", message: "Vui lòng chọn file audio để tải lên." } },
          { status: 400 }
        );
      }
      fileName = file.name;
      const ext = fileName.split(".").pop()?.toLowerCase() || "";
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          {
            error: {
              code: "UNSUPPORTED_AUDIO_FORMAT",
              message: `Định dạng .${ext} không được hỗ trợ. Chỉ chấp nhận MP3, WAV, M4A, AAC, FLAC.`,
            },
          },
          { status: 400 }
        );
      }
      const arrayBuf = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
      // Estimate duration if WAV or use provided duration
      if (customDuration > 0) {
        durationSec = customDuration;
      } else if (ext === "wav" && buffer.length > 44) {
        const byteRate = buffer.readUInt32LE(28) || 44100;
        durationSec = Math.max(4, Number(((buffer.length - 44) / byteRate).toFixed(2)));
      } else {
        durationSec = Math.max(8, Math.min(180, Math.round(buffer.length / 16000)));
      }
    } else {
      const body = await req.json();
      fileName = body.file_name || "synthesized_conversation.wav";
      durationSec = Number(body.duration || 24);
      buffer = StorageService.generateSynthesizedConversationWav(durationSec);
    }

    const ext = fileName.split(".").pop()?.toLowerCase() || "wav";
    const storageKey = StorageService.buildStorageKey(
      projectId,
      "audio",
      fileName
    );
    StorageService.saveObject(storageKey, buffer);
    const waveform = StorageService.extractWaveformPeaks(buffer, 96);

    const audioAsset = DarktoonRepository.createAudioAsset({
      project_id: projectId,
      file_name: fileName,
      storage_key: storageKey,
      format: ext,
      duration: durationSec,
      sample_rate: 22050,
      channels: 1,
      file_size: buffer.length,
      waveform,
    });

    DarktoonRepository.rebuildTimelineClips(projectId);
    return NextResponse.json({ audio: audioAsset }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

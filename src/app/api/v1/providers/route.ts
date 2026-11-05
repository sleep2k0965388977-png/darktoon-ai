import { NextRequest, NextResponse } from "next/server";
import { DarktoonRepository } from "@/backend/repositories/darktoonRepository";
import { ProviderRegistry } from "@/backend/providers/providerRegistry";
import { apiErrorResponse, getRequestUser } from "@/backend/services/authHelper";

export async function GET(req: NextRequest) {
  try {
    await getRequestUser(req);
    const statuses = ProviderRegistry.getAllProviderStatuses();
    const configs = DarktoonRepository.getAllProviderConfigs();
    return NextResponse.json({
      providers: statuses,
      active_defaults: {
        DEFAULT_ASR_PROVIDER: configs.DEFAULT_ASR_PROVIDER || process.env.DEFAULT_ASR_PROVIDER || "openai",
        DEFAULT_DIARIZATION_PROVIDER:
          configs.DEFAULT_DIARIZATION_PROVIDER ||
          process.env.DEFAULT_DIARIZATION_PROVIDER ||
          "openai",
        DEFAULT_LLM_PROVIDER: configs.DEFAULT_LLM_PROVIDER || process.env.DEFAULT_LLM_PROVIDER || "openai",
        DEFAULT_IMAGE_PROVIDER:
          configs.DEFAULT_IMAGE_PROVIDER || process.env.DEFAULT_IMAGE_PROVIDER || "openai",
        DEFAULT_VIDEO_PROVIDER:
          configs.DEFAULT_VIDEO_PROVIDER || process.env.DEFAULT_VIDEO_PROVIDER || "gemini",
        OPENAI_KEY_SET: Boolean(configs.OPENAI_API_KEY || process.env.OPENAI_API_KEY),
        GEMINI_KEY_SET: Boolean(configs.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
        REPLICATE_KEY_SET: Boolean(
          configs.REPLICATE_API_TOKEN || process.env.REPLICATE_API_TOKEN
        ),
      },
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await getRequestUser(req);
    const body = (await req.json()) as Record<string, string>;
    const allowedKeys = [
      "DEFAULT_ASR_PROVIDER",
      "DEFAULT_DIARIZATION_PROVIDER",
      "DEFAULT_LLM_PROVIDER",
      "DEFAULT_IMAGE_PROVIDER",
      "DEFAULT_VIDEO_PROVIDER",
      "OPENAI_API_KEY",
      "GEMINI_API_KEY",
      "REPLICATE_API_TOKEN",
    ];
    for (const k of allowedKeys) {
      if (body[k] !== undefined) {
        DarktoonRepository.setProviderConfig(k, String(body[k]).trim());
      }
    }
    return NextResponse.json({
      providers: ProviderRegistry.getAllProviderStatuses(),
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

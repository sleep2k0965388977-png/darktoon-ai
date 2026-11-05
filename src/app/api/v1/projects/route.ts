import { NextRequest, NextResponse } from "next/server";
import { DarktoonRepository } from "@/backend/repositories/darktoonRepository";
import { apiErrorResponse, getRequestUser } from "@/backend/services/authHelper";

export async function GET(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    const projects = DarktoonRepository.listProjects(user.id).map((p) => {
      const scenes = DarktoonRepository.getScenesByProject(p.id);
      const audio = DarktoonRepository.getProjectAudio(p.id);
      const costs = DarktoonRepository.getProjectCosts(p.id);
      return {
        ...p,
        scene_count: scenes.length,
        approved_scene_count: scenes.filter((s) => s.status === "APPROVED").length,
        audio_duration: audio?.duration || 0,
        total_cost_usd: costs.total_actual_usd,
      };
    });
    return NextResponse.json({ projects, total: projects.length });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    const body = await req.json();
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Tên dự án là bắt buộc." } },
        { status: 400 }
      );
    }
    const project = DarktoonRepository.createProject({
      user_id: user.id,
      name: body.name,
      description: body.description,
      aspect_ratio: body.aspect_ratio,
      resolution: body.resolution,
      fps: body.fps,
      style_id: body.style_id,
      language: body.language,
      budget_limit_usd: body.budget_limit_usd,
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

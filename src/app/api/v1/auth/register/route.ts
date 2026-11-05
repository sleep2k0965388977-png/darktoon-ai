import { NextRequest, NextResponse } from "next/server";
import { DarktoonRepository } from "@/backend/repositories/darktoonRepository";
import { apiErrorResponse } from "@/backend/services/authHelper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, display_name } = body;
    if (!email || !password) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Email và mật khẩu là bắt buộc." } },
        { status: 400 }
      );
    }
    const user = DarktoonRepository.registerUser(
      email,
      password,
      display_name || "Creator"
    );
    const res = NextResponse.json({ user }, { status: 201 });
    res.cookies.set("darktoon_user_id", user.id, { path: "/", httpOnly: false });
    return res;
  } catch (err) {
    return apiErrorResponse(err);
  }
}

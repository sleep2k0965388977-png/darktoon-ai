import { NextRequest, NextResponse } from "next/server";
import { DarktoonRepository } from "@/backend/repositories/darktoonRepository";
import { apiErrorResponse } from "@/backend/services/authHelper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;
    const user = DarktoonRepository.authenticateUser(email || "", password || "");
    if (!user) {
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Email hoặc mật khẩu không đúng." } },
        { status: 401 }
      );
    }
    const res = NextResponse.json({ user });
    res.cookies.set("darktoon_user_id", user.id, { path: "/", httpOnly: false });
    return res;
  } catch (err) {
    return apiErrorResponse(err);
  }
}

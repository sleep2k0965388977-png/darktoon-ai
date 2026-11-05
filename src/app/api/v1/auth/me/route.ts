import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, getRequestUser } from "@/backend/services/authHelper";

export async function GET(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    return NextResponse.json({ user });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

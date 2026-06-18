import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session-token";

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    clearSessionCookie(response);
    
    return response;
  } catch (err) {
    console.error("[logout] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

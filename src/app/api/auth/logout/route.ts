import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    
    // Delete session cookie
    response.cookies.delete("medixor-session");
    
    return response;
  } catch (err) {
    console.error("[logout] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

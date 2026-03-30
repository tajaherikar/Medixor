import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email: string; password: string };
    const user = await db.getUserByEmailAnyTenant(body.email ?? "");
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const { passwordHash: _ph, ...safeUser } = user;
    return NextResponse.json(safeUser);
  } catch (err) {
    console.error("[login] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

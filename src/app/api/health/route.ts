import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const envCheck = {
    supabaseUrl: url ? `set (${url.slice(0, 40)}...)` : "MISSING",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "MISSING",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING",
  };

  try {
    const res = await fetch(`${url}/rest/v1/users?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    const text = await res.text();
    return NextResponse.json({ env: envCheck, status: res.status, body: text.slice(0, 200) });
  } catch (err: unknown) {
    const cause = err instanceof Error && (err as NodeJS.ErrnoException).cause
      ? String((err as NodeJS.ErrnoException).cause)
      : "none";
    return NextResponse.json({ env: envCheck, fetchError: String(err), cause });
  }
}

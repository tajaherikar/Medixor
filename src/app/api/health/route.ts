import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const envCheck = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "MISSING",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING",
  };

  try {
    const { data, error } = await supabase.from("users").select("id").limit(1);
    return NextResponse.json({ env: envCheck, db: error ? `error: ${error.message}` : `ok (${data?.length} rows)` });
  } catch (err) {
    return NextResponse.json({ env: envCheck, db: `threw: ${String(err)}` });
  }
}

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  return NextResponse.json(
    { error: "Batch import endpoint not yet implemented" },
    { status: 501 }
  );
}

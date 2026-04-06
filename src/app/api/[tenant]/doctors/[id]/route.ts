import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { Doctor } from "@/lib/types";
import { calculateDoctorTarget } from "@/lib/doctor-target";
import { validateTenantAccess } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string; id: string }> }
) {
  const { tenant, id } = await params;
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) return authResult;
  
  const body = await req.json() as Partial<Doctor>;
  
  // Recalculate targetAmount if allocatedAmount or targetPercentage changed
  if (body.allocatedAmount !== undefined || body.targetPercentage !== undefined) {
    const allocatedAmount = body.allocatedAmount ?? 0;
    const targetPercentage = body.targetPercentage ?? 0;
    body.targetAmount = calculateDoctorTarget(allocatedAmount, targetPercentage);
  }
  
  await db.updateDoctor(id, body as never);
  return NextResponse.json({ success: true });
}

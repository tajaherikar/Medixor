import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { Doctor } from "@/lib/types";
import { calculateDoctorTarget } from "@/lib/doctor-target";
import { validateTenantAccess } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) return authResult;
  
  const doctors = await db.getDoctors(tenant);
  return NextResponse.json(doctors);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) return authResult;
  
  const body = await req.json() as Partial<Doctor>;
  
  const allocatedAmount = body.allocatedAmount ?? 0;
  const targetPercentage = body.targetPercentage ?? 0;
  const targetAmount = calculateDoctorTarget(allocatedAmount, targetPercentage);
  
  const doctor: Doctor = {
    id: `doc-${Date.now()}`,
    tenantId: tenant,
    name: body.name!,
    type: body.type ?? "doctor",
    phone: body.phone,
    allocatedAmount,
    targetPercentage,
    targetAmount,
    createdAt: new Date().toISOString(),
  };
  await db.addDoctor(doctor);
  return NextResponse.json(doctor, { status: 201 });
}

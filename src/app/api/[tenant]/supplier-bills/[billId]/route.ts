import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { SupplierBill } from "@/lib/types";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string; billId: string }> }
) {
  try {
    const { tenant, billId } = await params;
    const body = await req.json();

    // Add editedAt timestamp
    const updatedBill: Partial<SupplierBill> = {
      ...body,
      editedAt: new Date().toISOString(),
    };

    await db.updateSupplierBill(billId, updatedBill);

    return NextResponse.json(
      { success: true, message: "Bill updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating supplier bill:", error);
    return NextResponse.json(
      { error: "Failed to update bill" },
      { status: 500 }
    );
  }
}

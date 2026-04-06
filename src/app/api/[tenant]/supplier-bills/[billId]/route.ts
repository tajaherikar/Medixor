import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { SupplierBill, Batch } from "@/lib/types";
import { getInventoryStatus } from "@/lib/batch-logic";
import { validateTenantAccess } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string; billId: string }> }
) {
  try {
    const { tenant, billId } = await params;
    const authResult = await validateTenantAccess(req, tenant);
    if (authResult instanceof NextResponse) return authResult;
    
    const body = await req.json();

    // Get existing bill to compare items
    const existingBills = await db.getSupplierBills(tenant);
    const existingBill = existingBills.find((b) => b.id === billId);
    
    if (!existingBill) {
      return NextResponse.json(
        { error: "Bill not found" },
        { status: 404 }
      );
    }

    // Only update mutable fields, preserve all other data
    const updatedBill: Record<string, any> = {
      invoiceNumber: body.invoiceNumber,
      date: body.date,
      dueDate: body.dueDate,
      items: body.items,
      taxableAmount: body.taxableAmount,
      totalGst: body.totalGst,
      grandTotal: body.grandTotal,
    };

    // Add optional supplier fields if provided
    if (body.supplierName) updatedBill.supplierName = body.supplierName;
    if (body.supplierGstNumber !== undefined) updatedBill.supplierGstNumber = body.supplierGstNumber || null;
    if (body.supplierLicenseNumber !== undefined) updatedBill.supplierLicenseNumber = body.supplierLicenseNumber || null;
    if (body.supplierAddress !== undefined) updatedBill.supplierAddress = body.supplierAddress || null;

    console.log("Updating bill:", { billId, tenant, existingItemCount: existingBill.items.length, newItemCount: body.items.length });

    // Find newly added items by comparing batch numbers
    const existingBatchNumbers = new Set(existingBill.items.map((i: any) => i.batchNumber));
    const newItems = (body.items ?? []).filter((item: any) => !existingBatchNumbers.has(item.batchNumber));

    // Create batches for newly added items
    if (newItems.length > 0) {
      console.log(`Creating ${newItems.length} new batches for added items`);
      const supplierId = body.supplierId || existingBill.supplierId;
      const supplierName = body.supplierName || existingBill.supplierName;
      const invoiceNumber = body.invoiceNumber || existingBill.invoiceNumber;

      for (const item of newItems) {
        const newBatch: Batch = {
          id: `bat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          tenantId: tenant,
          itemName: item.itemName,
          batchNumber: item.batchNumber,
          supplierId,
          supplierName,
          invoiceNumber,
          expiryDate: item.expiryDate,
          mrp: item.mrp,
          purchasePrice: item.purchasePrice,
          availableQty: item.quantity,
          originalQty: item.quantity,
          status: getInventoryStatus(item.expiryDate),
          ...(item.unitType && { unitType: item.unitType as Batch["unitType"] }),
          ...(item.packSize && { packSize: item.packSize }),
          createdAt: new Date().toISOString(),
        };
        await db.addBatch(newBatch);
      }
    }

    await db.updateSupplierBill(billId, updatedBill);

    return NextResponse.json(
      { success: true, message: "Bill updated successfully", billId, newBatchesCreated: newItems.length },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Error updating supplier bill:", errorMsg);
    return NextResponse.json(
      { error: "Failed to update bill", details: errorMsg },
      { status: 500 }
    );
  }
}

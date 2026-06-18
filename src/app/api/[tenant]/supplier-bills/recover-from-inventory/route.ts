import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { validateTenantAccess } from "@/lib/auth-helpers";
import {
  analyzeReconciliation,
  buildBillFromBatches,
  syncBillFromBatches,
} from "@/lib/bill-recovery-utils";

export const dynamic = "force-dynamic";

function billUpdatePayload(updated: ReturnType<typeof syncBillFromBatches>) {
  return {
    items: updated.items,
    taxableAmount: updated.taxableAmount,
    totalGst: updated.totalGst,
    grandTotal: updated.grandTotal,
    paymentStatus: updated.paymentStatus,
    editedAt: updated.editedAt,
  };
}

/**
 * GET: Analyze missing bills and incomplete bills (vs inventory)
 * POST: recover-missing | sync-incomplete | sync-bill
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant } = await params;
    const authResult = await validateTenantAccess(req, tenant);
    if (authResult instanceof NextResponse) return authResult;

    const [batches, bills] = await Promise.all([
      db.getBatches(tenant),
      db.getSupplierBills(tenant),
    ]);

    return NextResponse.json(analyzeReconciliation(batches, bills), { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Error analyzing bill reconciliation:", errorMsg);
    return NextResponse.json(
      { error: "Failed to analyze bills", details: errorMsg },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant } = await params;
    const authResult = await validateTenantAccess(req, tenant);
    if (authResult instanceof NextResponse) return authResult;

    const body = await req.json();
    const { action, billId } = body as { action?: string; billId?: string };

    const [batches, bills] = await Promise.all([
      db.getBatches(tenant),
      db.getSupplierBills(tenant),
    ]);

    const report = analyzeReconciliation(batches, bills);

    if (action === "recover-missing") {
      const recovered = [];
      for (const group of report.recovery.groups) {
        const bill = buildBillFromBatches(tenant, batches, group);
        await db.addSupplierBill(bill);
        recovered.push({
          billId: bill.id,
          invoiceNumber: bill.invoiceNumber,
          supplierName: bill.supplierName,
          itemsCount: bill.items.length,
          grandTotal: bill.grandTotal,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Recovered ${recovered.length} missing bill(s)`,
        recovered,
      });
    }

    if (action === "sync-incomplete" || action === "sync-bill") {
      const targets =
        action === "sync-bill"
          ? report.sync.bills.filter((m) => m.billId === billId)
          : report.sync.bills;

      if (action === "sync-bill" && !billId) {
        return NextResponse.json({ error: "Missing billId" }, { status: 400 });
      }
      if (action === "sync-bill" && targets.length === 0) {
        return NextResponse.json({ error: "Bill not found or already in sync" }, { status: 404 });
      }

      const synced: Array<{
        billId: string;
        invoiceNumber: string;
        itemsBefore: number;
        itemsAfter: number;
      }> = [];
      const failures: Array<{ billId: string; invoiceNumber: string; error: string }> = [];

      for (const mismatch of targets) {
        const bill = bills.find((b) => b.id === mismatch.billId);
        if (!bill) continue;

        const updated = syncBillFromBatches(bill, batches);
        const payload = billUpdatePayload(updated);

        try {
          const saved = await db.updateSupplierBill(bill.id, payload);
          const persistedCount = saved?.items?.length ?? 0;

          if (persistedCount < updated.items.length) {
            failures.push({
              billId: bill.id,
              invoiceNumber: bill.invoiceNumber,
              error: `Expected ${updated.items.length} items but database saved ${persistedCount}`,
            });
            continue;
          }

          synced.push({
            billId: bill.id,
            invoiceNumber: bill.invoiceNumber,
            itemsBefore: mismatch.billItemCount,
            itemsAfter: persistedCount,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          failures.push({
            billId: bill.id,
            invoiceNumber: bill.invoiceNumber,
            error: msg,
          });
        }
      }

      if (synced.length === 0 && failures.length > 0) {
        const detail = failures.map((f) => `${f.invoiceNumber}: ${f.error}`).join("; ");
        return NextResponse.json(
          {
            success: false,
            error: "Sync failed — bills were not updated in the database",
            details: detail,
            failures,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Synced ${synced.length} bill(s) from inventory`,
        synced,
        ...(failures.length > 0 ? { failures } : {}),
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Error reconciling bills:", errorMsg);
    return NextResponse.json(
      { error: "Failed to reconcile bills", details: errorMsg },
      { status: 500 }
    );
  }
}

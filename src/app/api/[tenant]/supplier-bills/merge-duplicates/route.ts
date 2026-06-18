import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { validateTenantAccess } from "@/lib/auth-helpers";
import {
  analyzeForDuplicates,
  mergeInvoiceGroup,
  duplicateGroupKey,
  type MergeReport,
  type DuplicateGroup,
} from "@/lib/invoice-merge-utils";

export const dynamic = "force-dynamic";

/**
 * GET: Analyze for duplicates and return report
 * POST: Merge a specific duplicate group or all duplicates
 *
 * Query params:
 * - action: "analyze" (GET only) or "merge" (POST, merge specified group)
 * - groupKey: "invoiceNumber::supplierId" format for merging specific group
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant } = await params;
    const authResult = await validateTenantAccess(req, tenant);
    if (authResult instanceof NextResponse) return authResult;

    const bills = await db.getSupplierBills(tenant);
    const report = analyzeForDuplicates(bills);

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Error analyzing duplicates:", errorMsg);
    return NextResponse.json(
      { error: "Failed to analyze duplicates", details: errorMsg },
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
    const { action, groupKey } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Missing action parameter" },
        { status: 400 }
      );
    }

    const bills = await db.getSupplierBills(tenant);
    const report = analyzeForDuplicates(bills);

    if (action === "merge-group") {
      // Merge specific group by key "invoiceNumber::supplierId"
      if (!groupKey) {
        return NextResponse.json(
          { error: "Missing groupKey parameter" },
          { status: 400 }
        );
      }

      const group = report.groups.find(
        (g) => duplicateGroupKey(g.invoiceNumber, g.supplierId, g.date) === groupKey
      );
      if (!group) {
        return NextResponse.json(
          { error: "Group not found" },
          { status: 404 }
        );
      }

      const billsInGroup = bills.filter((b) => group.billIds.includes(b.id));
      const { mergedBill, mergedBillIds } = mergeInvoiceGroup(billsInGroup);

      // Update primary bill with merged data
      await db.updateSupplierBill(mergedBill.id, {
        items: mergedBill.items,
        taxableAmount: mergedBill.taxableAmount,
        totalGst: mergedBill.totalGst,
        grandTotal: mergedBill.grandTotal,
        paidAmount: mergedBill.paidAmount,
        paymentStatus: mergedBill.paymentStatus,
        editedAt: mergedBill.editedAt,
      });

      // Delete the bills that were merged
      for (const billId of mergedBillIds) {
        try {
          await db.deleteSupplierBill(billId);
          console.log(`Deleted merged bill ${billId}`);
        } catch (err) {
          console.error(`Error deleting bill ${billId}:`, err);
        }
      }

      return NextResponse.json(
        {
          success: true,
          message: `Merged ${mergedBillIds.length} bill(s) into ${mergedBill.id}`,
          mergedBillId: mergedBill.id,
          mergedBillIds,
          itemsCount: mergedBill.items.length,
          newTotals: {
            taxableAmount: mergedBill.taxableAmount,
            totalGst: mergedBill.totalGst,
            grandTotal: mergedBill.grandTotal,
          },
        },
        { status: 200 }
      );
    } else if (action === "merge-all") {
      // Merge all duplicate groups
      const results = [];

      for (const group of report.groups) {
        const billsInGroup = bills.filter((b) => group.billIds.includes(b.id));
        const { mergedBill, mergedBillIds } = mergeInvoiceGroup(billsInGroup);

        // Update primary bill
        await db.updateSupplierBill(mergedBill.id, {
          items: mergedBill.items,
          taxableAmount: mergedBill.taxableAmount,
          totalGst: mergedBill.totalGst,
          grandTotal: mergedBill.grandTotal,
          paidAmount: mergedBill.paidAmount,
          paymentStatus: mergedBill.paymentStatus,
          editedAt: mergedBill.editedAt,
        });

        // Delete the bills that were merged
        for (const billId of mergedBillIds) {
          try {
            await db.deleteSupplierBill(billId);
          } catch (err) {
            console.error(`Error deleting bill ${billId}:`, err);
          }
        }

        results.push({
          invoiceNumber: group.invoiceNumber,
          primaryBillId: mergedBill.id,
          mergedBillIds,
          itemsCount: mergedBill.items.length,
        });
      }

      return NextResponse.json(
        {
          success: true,
          message: `Merged ${report.duplicateGroupsFound} duplicate groups`,
          billsMerged: report.billsToMerge,
          results,
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Error merging invoices:", errorMsg);
    return NextResponse.json(
      { error: "Failed to merge invoices", details: errorMsg },
      { status: 500 }
    );
  }
}

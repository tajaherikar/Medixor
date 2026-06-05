import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { validateTenantAccess } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

/**
 * Migration API: Convert Expiry Dates from YYYY-MM-DD to YYYY-MM Format
 * 
 * This endpoint migrates all supplier bills to use the new month/year format
 * for expiry dates instead of full dates.
 * 
 * Requires admin authentication
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant } = await params;
    const authResult = await validateTenantAccess(req, tenant);
    if (authResult instanceof NextResponse) return authResult;

    console.log(`[Migration] Starting expiry date format migration for tenant: ${tenant}`);

    // Get all bills for this tenant
    const bills = await db.getSupplierBills(tenant);
    console.log(`[Migration] Found ${bills.length} bills to process`);

    let migratedCount = 0;
    let itemsConverted = 0;

    for (const bill of bills) {
      // Check if items have expiry dates that need conversion
      const updatedItems = bill.items.map((item) => {
        if (item.expiryDate && item.expiryDate.length > 7) {
          // Convert YYYY-MM-DD to YYYY-MM (just take first 7 characters)
          const converted = item.expiryDate.substring(0, 7);
          console.log(`  Converting: ${item.expiryDate} → ${converted} (${item.itemName})`);
          itemsConverted++;
          return { ...item, expiryDate: converted };
        }
        return item;
      });

      // Check if any items were converted
      const hasChanges = updatedItems.some((item, idx) =>
        item.expiryDate !== bill.items[idx].expiryDate
      );

      if (hasChanges) {
        // Update the bill with converted dates
        await db.updateSupplierBill(bill.id, { items: updatedItems });
        migratedCount++;
        console.log(`[Migration] Updated bill ${bill.invoiceNumber}`);
      }
    }

    const message = `Migration complete! ${migratedCount} bills updated, ${itemsConverted} items converted.`;
    console.log(`[Migration] ${message}`);

    return NextResponse.json(
      {
        success: true,
        message,
        billsUpdated: migratedCount,
        itemsConverted,
        tenantId: tenant,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Migration] Error:", errorMsg);
    return NextResponse.json(
      { error: "Migration failed", details: errorMsg },
      { status: 500 }
    );
  }
}

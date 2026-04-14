import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { validateTenantAccess, requireAdmin } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) return authResult;
  
  const url = new URL(req.url);
  const partyId = url.searchParams.get("partyId");
  const partyType = url.searchParams.get("partyType");
  let payments = await db.getPayments(tenant);
  if (partyId) payments = payments.filter((p) => p.partyId === partyId);
  if (partyType) payments = payments.filter((p) => p.partyType === partyType);
  return NextResponse.json(payments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) return authResult;
  
  // Only admins can record payments
  const adminCheck = requireAdmin(authResult);
  if (adminCheck) return adminCheck;
  
  const body = await req.json() as Record<string, unknown>;
  
  // Validate amount - must be a positive number
  const amount = Number(body.amount);
  if (isNaN(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 }
    );
  }
  
  const payment = {
    id: `pay-${Date.now()}`,
    tenantId: tenant,
    createdAt: new Date().toISOString(),
    ...body,
    amount, // Use validated/coerced amount
  };
  await db.addPayment(payment as never);

  // Update invoice/bill paidAmount + paymentStatus
  const invoiceId = body.invoiceId as string | undefined;
  const partyType = body.partyType as string | undefined;
  
  if (invoiceId && amount != null) {
    if (partyType === "customer") {
      // Update customer invoice
      const invoices = await db.getInvoices(tenant);
      const inv = invoices.find((i) => i.id === invoiceId);
      if (inv) {
        const newPaid = (inv.paidAmount ?? 0) + amount;
        await db.updateInvoice(invoiceId, {
          paidAmount: newPaid,
          paymentStatus:
            newPaid >= inv.grandTotal ? "paid"
            : newPaid > 0 ? "partial"
            : "unpaid",
        });
      }
    } else if (partyType === "supplier") {
      // Update supplier bill
      const bills = await db.getSupplierBills(tenant);
      const bill = bills.find((b) => b.id === invoiceId);
      if (bill) {
        const newPaid = (bill.paidAmount ?? 0) + amount;
        await db.updateSupplierBill(invoiceId, {
          paidAmount: newPaid,
          paymentStatus:
            newPaid >= bill.grandTotal ? "paid"
            : newPaid > 0 ? "partial"
            : "unpaid",
        });
      }
    }
  }

  return NextResponse.json(payment, { status: 201 });
}

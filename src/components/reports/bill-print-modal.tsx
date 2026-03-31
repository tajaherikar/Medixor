"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SupplierBill } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { Printer } from "lucide-react";

interface Props {
  bill: SupplierBill | null;
  tenant: string;
  onClose: () => void;
}

const fmt = (n: number) =>
  "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);

const esc = (s: string | number | undefined) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function buildPrintHtml(bill: SupplierBill, tenant: string): string {
  const payStyle = {
    paid:    "background:#dcfce7;color:#15803d",
    partial: "background:#fef3c7;color:#b45309",
    unpaid:  "background:#fee2e2;color:#b91c1c",
  }[bill.paymentStatus] ?? "background:#f3f4f6;color:#374151";

  const rows = bill.items
    .map(
      (item, i) => `<tr>
        <td>${i + 1}</td>
        <td>${esc(item.itemName)}</td>
        <td style="font-family:monospace">${esc(item.hsnCode)}</td>
        <td style="font-family:monospace;font-size:10px">${esc(item.batchNumber)}</td>
        <td>${esc(item.expiryDate)}</td>
        <td style="text-align:right">${fmt(item.mrp)}</td>
        <td style="text-align:right">${fmt(item.purchasePrice)}</td>
        <td style="text-align:right">${item.quantity}</td>
        <td style="text-align:right">${item.gstRate}%</td>
        <td style="text-align:right">${fmt(item.taxableAmount)}</td>
        <td style="text-align:right">${fmt(item.cgst + item.sgst)}</td>
        <td style="text-align:right;font-weight:600">${fmt(item.lineTotal)}</td>
      </tr>`
    )
    .join("");

  const totalCgst = bill.items.reduce((s, i) => s + i.cgst, 0);
  const totalSgst = bill.items.reduce((s, i) => s + i.sgst, 0);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Purchase Bill ${esc(bill.invoiceNumber)}</title><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:24px;max-width:960px;margin:0 auto}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #0d9488}
.brand{font-size:22px;font-weight:800;color:#0d9488}
.brand-sub{font-size:11px;color:#666;text-transform:capitalize;margin-top:2px}
.title{font-size:18px;font-weight:700;text-align:right;text-transform:uppercase;letter-spacing:1px}
.meta{font-size:11px;color:#555;text-align:right;margin-top:4px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px}
.box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:10px 12px}
.lbl{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af;margin-bottom:4px}
.nm{font-size:13px;font-weight:600}
.sub{font-size:11px;color:#6b7280;margin-top:2px}
table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px}
thead tr{background:#0d9488;color:white}
th{padding:6px 7px;text-align:left;font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap}
tbody tr{border-bottom:1px solid #f0f0f0}
tbody tr:nth-child(even){background:#fafafa}
td{padding:5px 7px;vertical-align:middle}
.tot{width:290px;margin-left:auto;border-collapse:collapse;font-size:12px}
.tot td:last-child{text-align:right}
.tot tr.grand td{font-weight:700;font-size:14px;border-top:2px solid #0d9488;color:#0d9488;padding-top:6px}
.badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600}
.footer{margin-top:28px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:10px}
@media print{@page{margin:1cm}}
</style></head><body>
<div class="hdr">
  <div><div class="brand">Medixor</div><div class="brand-sub">${esc(tenant)}</div></div>
  <div>
    <div class="title">Purchase Bill / GRN</div>
    <div class="meta">Invoice #${esc(bill.invoiceNumber)} &nbsp;|&nbsp; ${format(parseISO(bill.date), "dd MMM yyyy")}</div>
    <div class="meta" style="margin-top:4px"><span class="badge" style="${payStyle}">${esc(bill.paymentStatus.charAt(0).toUpperCase() + bill.paymentStatus.slice(1))}</span></div>
  </div>
</div>
<div class="grid">
  <div class="box">
    <div class="lbl">Supplier</div>
    <div class="nm">${esc(bill.supplierName)}</div>
  </div>
  <div class="box">
    <div class="lbl">Bill Details</div>
    <div class="sub">Invoice No: ${esc(bill.invoiceNumber)}</div>
    <div class="sub">Date: ${format(parseISO(bill.date), "dd MMM yyyy")}</div>
    ${bill.dueDate ? `<div class="sub">Due: ${esc(bill.dueDate)}</div>` : ""}
    ${bill.paidAmount > 0 && bill.paymentStatus !== "paid" ? `<div class="sub">Paid: ${fmt(bill.paidAmount)}</div>` : ""}
  </div>
</div>
<table>
  <thead><tr>
    <th>#</th><th>Item</th><th>HSN</th><th>Batch</th><th>Expiry</th>
    <th style="text-align:right">MRP</th><th style="text-align:right">Purchase Price</th>
    <th style="text-align:right">Qty</th><th style="text-align:right">GST%</th>
    <th style="text-align:right">Taxable</th><th style="text-align:right">GST Amt</th>
    <th style="text-align:right">Total</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<table class="tot">
  <tr><td>Taxable Amount</td><td>${fmt(bill.taxableAmount)}</td></tr>
  <tr><td>CGST (ITC)</td><td>${fmt(totalCgst)}</td></tr>
  <tr><td>SGST (ITC)</td><td>${fmt(totalSgst)}</td></tr>
  <tr class="grand"><td>Grand Total</td><td>${fmt(bill.grandTotal)}</td></tr>
</table>
<div class="footer">Goods Received Note &mdash; Medixor</div>
<script>window.onload=function(){window.print();window.addEventListener("afterprint",function(){window.close()})}</script>
</body></html>`;
}

const payColors: Record<string, string> = {
  paid:    "bg-green-100 text-green-700",
  partial: "bg-amber-100 text-amber-700",
  unpaid:  "bg-red-100 text-red-700",
};

export function BillPrintModal({ bill, tenant, onClose }: Props) {
  if (!bill) return null;

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=960,height=650");
    if (!win) return;
    win.document.write(buildPrintHtml(bill, tenant));
    win.document.close();
  };

  const totalCgst = bill.items.reduce((s, i) => s + i.cgst, 0);
  const totalSgst = bill.items.reduce((s, i) => s + i.sgst, 0);

  return (
    <Dialog open={!!bill} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between pr-6">
            <div>
              <DialogTitle>Purchase Bill — #{bill.invoiceNumber}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {bill.supplierName} · {format(parseISO(bill.date), "dd MMM yyyy")}
              </p>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / PDF
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-border">
            <div>
              <p className="text-xl font-bold text-primary">Medixor</p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{tenant}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold uppercase tracking-wider">Purchase Bill / GRN</p>
              <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${payColors[bill.paymentStatus] ?? payColors.unpaid}`}>
                {bill.paymentStatus.charAt(0).toUpperCase() + bill.paymentStatus.slice(1)}
              </span>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Supplier</p>
              <p className="font-semibold text-sm">{bill.supplierName}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Bill Details</p>
              <p className="text-xs text-muted-foreground">Invoice No: {bill.invoiceNumber}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Date: {format(parseISO(bill.date), "dd MMM yyyy")}</p>
              {bill.dueDate && (
                <p className="text-xs text-muted-foreground mt-0.5">Due: {bill.dueDate}</p>
              )}
              {bill.paidAmount > 0 && bill.paymentStatus !== "paid" && (
                <p className="text-xs text-muted-foreground mt-0.5">Paid: {fmt(bill.paidAmount)}</p>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  {["#", "Item", "HSN", "Batch", "Expiry", "MRP", "Purchase Price", "Qty", "GST%", "Taxable", "GST Amt", "Total"].map(
                    (h, i) => (
                      <th key={h} className={`px-2 py-2 font-semibold whitespace-nowrap ${i >= 5 ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item, i) => (
                  <tr key={i} className="border-b border-border/50 even:bg-muted/20">
                    <td className="px-2 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-2 font-medium">{item.itemName}</td>
                    <td className="px-2 py-2 font-mono">{item.hsnCode}</td>
                    <td className="px-2 py-2 font-mono text-muted-foreground">{item.batchNumber}</td>
                    <td className="px-2 py-2 text-muted-foreground">{item.expiryDate}</td>
                    <td className="px-2 py-2 text-right">{fmt(item.mrp)}</td>
                    <td className="px-2 py-2 text-right">{fmt(item.purchasePrice)}</td>
                    <td className="px-2 py-2 text-right">{item.quantity}</td>
                    <td className="px-2 py-2 text-right">{item.gstRate}%</td>
                    <td className="px-2 py-2 text-right">{fmt(item.taxableAmount)}</td>
                    <td className="px-2 py-2 text-right text-blue-600">{fmt(item.cgst + item.sgst)}</td>
                    <td className="px-2 py-2 text-right font-semibold">{fmt(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <table className="text-sm w-64">
              <tbody>
                <tr>
                  <td className="py-1 pr-6 text-muted-foreground">Taxable Amount</td>
                  <td className="py-1 text-right">{fmt(bill.taxableAmount)}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-6 text-muted-foreground">CGST (ITC)</td>
                  <td className="py-1 text-right text-blue-600">{fmt(totalCgst)}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-6 text-muted-foreground">SGST (ITC)</td>
                  <td className="py-1 text-right text-blue-600">{fmt(totalSgst)}</td>
                </tr>
                <tr className="border-t-2 border-primary">
                  <td className="pt-2 pr-6 font-bold text-base text-primary">Grand Total</td>
                  <td className="pt-2 text-right font-bold text-base text-primary">{fmt(bill.grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

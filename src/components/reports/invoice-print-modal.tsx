"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Invoice } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { Printer, MessageCircle, Mail } from "lucide-react";
import { useSettingsStore } from "@/lib/stores";

interface Props {
  invoice: Invoice | null;
  tenant: string;
  onClose: () => void;
}

const fmt = (n: number) =>
  "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);

// Escape HTML entities to prevent XSS in the print window template
const esc = (s: string | number | undefined) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function buildPrintHtml(
  inv: Invoice,
  tenant: string,
  opts: { businessName: string; logoBase64: string | null; gstin: string; address: string; phone: string; invoiceFooter: string; accentHue: number; showReferenceField: boolean }
): string {
  const accentColor = `oklch(0.52 0.15 ${opts.accentHue})`;
  // Approximate analogous hex for table headers (CSS oklch may not render in all print engines)
  // Keep a hex-like fallback using the preset map
  const hexMap: Record<number, string> = {
    196: "#0d9488", 210: "#0891b2", 240: "#2563eb", 258: "#4f46e5",
    275: "#7c3aed", 290: "#9333ea", 15: "#e11d48", 50: "#ea580c",
    65: "#d97706", 152: "#16a34a",
  };
  const accent = hexMap[opts.accentHue] ?? "#0d9488";

  const payStyle = {
    paid:    "background:#dcfce7;color:#15803d",
    partial: "background:#fef3c7;color:#b45309",
    unpaid:  "background:#fee2e2;color:#b91c1c",
  }[inv.paymentStatus] ?? "background:#f3f4f6;color:#374151";

  const rows = inv.lineItems
    .map(
      (l, i) => `<tr>
        <td>${i + 1}</td>
        <td>${esc(l.itemName)}</td>
        <td style="font-family:monospace">${esc(l.hsnCode)}</td>
        <td style="font-family:monospace;font-size:10px">${esc(l.batchNumber)}</td>
        <td>${esc(l.expiryDate)}</td>
        <td style="text-align:right">${fmt(l.mrp)}</td>
        <td style="text-align:right">${l.quantity}</td>
        <td style="text-align:right">${l.discountValue ? (l.discountType === "percentage" ? l.discountValue + "%" : fmt(l.discountValue)) : "—"}</td>
        <td style="text-align:right">${l.gstRate}%</td>
        <td style="text-align:right">${fmt(l.taxableAmount)}</td>
        <td style="text-align:right">${fmt(l.cgst + l.sgst)}</td>
        <td style="text-align:right;font-weight:600">${fmt(l.lineTotalWithGst)}</td>
      </tr>`
    )
    .join("");

  const totalCgst = inv.lineItems.reduce((s, l) => s + l.cgst, 0);
  const totalSgst = inv.lineItems.reduce((s, l) => s + l.sgst, 0);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${esc(inv.id)}</title><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:24px;max-width:960px;margin:0 auto}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid ${accent}}
.brand{font-size:22px;font-weight:800;color:${accent}}
.brand-sub{font-size:11px;color:#666;margin-top:2px}
.brand-meta{font-size:10px;color:#888;margin-top:3px;line-height:1.5}
.logo{max-height:56px;max-width:180px;object-fit:contain;margin-bottom:4px}
.title{font-size:18px;font-weight:700;text-align:right;text-transform:uppercase;letter-spacing:1px}
.meta{font-size:11px;color:#555;text-align:right;margin-top:4px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px}
.box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:10px 12px}
.lbl{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af;margin-bottom:4px}
.nm{font-size:13px;font-weight:600}
.sub{font-size:11px;color:#6b7280;margin-top:2px}
table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px}
thead tr{background:${accent};color:white}
th{padding:6px 7px;text-align:left;font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap}
tbody tr{border-bottom:1px solid #f0f0f0}
tbody tr:nth-child(even){background:#fafafa}
td{padding:5px 7px;vertical-align:middle}
.tot{width:290px;margin-left:auto;border-collapse:collapse;font-size:12px}
.tot td:last-child{text-align:right}
.tot tr.grand td{font-weight:700;font-size:14px;border-top:2px solid ${accent};color:${accent};padding-top:6px}
.badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600}
.footer{margin-top:28px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:10px}
@media print{@page{margin:1cm}}
</style></head><body>
<div class="hdr">
  <div>
    ${opts.logoBase64 ? `<img src="${opts.logoBase64}" class="logo" alt="logo" />` : ""}
    <div class="brand">${esc(opts.businessName || "Medixor")}</div>
    <div class="brand-sub" style="text-transform:capitalize">${esc(tenant)}</div>
    ${opts.gstin ? `<div class="brand-meta">GSTIN: ${esc(opts.gstin)}</div>` : ""}
    ${opts.address ? `<div class="brand-meta">${esc(opts.address).replace(/\n/g, "<br>")}</div>` : ""}
    ${opts.phone ? `<div class="brand-meta">Ph: ${esc(opts.phone)}</div>` : ""}
  </div>
  <div>
    <div class="title">Tax Invoice</div>
    <div class="meta">${esc(inv.id.toUpperCase())} &nbsp;|&nbsp; ${format(parseISO(inv.createdAt), "dd MMM yyyy")}</div>
    <div class="meta" style="margin-top:4px"><span class="badge" style="${payStyle}">${esc(inv.paymentStatus.charAt(0).toUpperCase() + inv.paymentStatus.slice(1))}</span></div>
  </div>
</div>
<div class="grid">
  <div class="box">
    <div class="lbl">Billed To</div>
    <div class="nm">${esc(inv.customerName)}</div>
    ${inv.customerGstNumber ? `<div class="sub" style="font-family:monospace">GST: ${esc(inv.customerGstNumber)}</div>` : ""}
    ${inv.customerLicenseNumber ? `<div class="sub" style="font-family:monospace">License: ${esc(inv.customerLicenseNumber)}</div>` : ""}
    ${inv.customerAddress ? `<div class="sub">${esc(inv.customerAddress).replace(/\n/g, "<br>")}</div>` : ""}
    ${opts.showReferenceField && inv.referredBy ? `<div class="sub">Ref: ${esc(inv.referredBy)}</div>` : ""}
  </div>
  <div class="box">
    <div class="lbl">Invoice Details</div>
    <div class="sub">Date: ${format(parseISO(inv.createdAt), "dd MMM yyyy")}</div>
    ${inv.dueDate ? `<div class="sub">Due: ${esc(inv.dueDate)}</div>` : ""}
    ${inv.paidAmount > 0 && inv.paymentStatus !== "paid" ? `<div class="sub">Paid: ${fmt(inv.paidAmount)}</div>` : ""}
  </div>
</div>
<table>
  <thead><tr>
    <th>#</th><th>Item</th><th>HSN</th><th>Batch</th><th>Expiry</th>
    <th style="text-align:right">MRP</th><th style="text-align:right">Qty</th>
    <th style="text-align:right">Disc</th><th style="text-align:right">GST%</th>
    <th style="text-align:right">Taxable</th><th style="text-align:right">GST Amt</th>
    <th style="text-align:right">Total</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<table class="tot">
  <tr><td>Subtotal</td><td>${fmt(inv.subtotal)}</td></tr>
  ${inv.customerDiscountAmount > 0 ? `<tr><td style="color:#b91c1c">Discount</td><td style="color:#b91c1c">−${fmt(inv.customerDiscountAmount)}</td></tr>` : ""}
  <tr><td>Taxable Amount</td><td>${fmt(inv.taxableAmount)}</td></tr>
  <tr><td>CGST</td><td>${fmt(totalCgst)}</td></tr>
  <tr><td>SGST</td><td>${fmt(totalSgst)}</td></tr>
  <tr class="grand"><td>Grand Total</td><td>${fmt(inv.grandTotal)}</td></tr>
</table>
<div class="footer">${esc(opts.invoiceFooter || "Thank you for your business.")}</div>
<script>window.onload=function(){window.print();window.addEventListener("afterprint",function(){window.close()})}</script>
</body></html>`;
}

const payColors: Record<string, string> = {
  paid:    "bg-green-100 text-green-700",
  partial: "bg-amber-100 text-amber-700",
  unpaid:  "bg-red-100 text-red-700",
};

export function InvoicePrintModal({ invoice, tenant, onClose }: Props) {
  const settings = useSettingsStore((s) => s.settings);
  if (!invoice) return null;

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=960,height=650");
    if (!win) return;
    win.document.write(buildPrintHtml(invoice, tenant, settings));
    win.document.close();
  };

  const handleWhatsApp = () => {
    const balance = invoice.grandTotal - (invoice.paidAmount ?? 0);
    const itemSummary = invoice.lineItems
      .slice(0, 3)
      .map((l) => `${l.itemName} x${l.quantity}`)
      .join(", ");
    const extra = invoice.lineItems.length > 3 ? ` +${invoice.lineItems.length - 3} more` : "";
    const lines = [
      `Hi ${invoice.customerName},`,
      ``,
      `Your invoice *${invoice.id.toUpperCase()}* from *${settings.businessName || "us"}* dated ${format(parseISO(invoice.createdAt), "dd MMM yyyy")} is ready.`,
      ``,
      `Items: ${itemSummary}${extra}`,
      `Grand Total: ₹${invoice.grandTotal.toLocaleString("en-IN")}`,
      ...(balance > 0 && invoice.paymentStatus !== "paid"
        ? [`Balance Due: ₹${balance.toLocaleString("en-IN")}`]
        : ["Status: Paid"]),
      ``,
      `Thank you for your business.`,
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  };

  const handleEmail = () => {
    const balance = invoice.grandTotal - (invoice.paidAmount ?? 0);
    const bodyLines = [
      `Dear ${invoice.customerName},`,
      ``,
      `Please find the details of your invoice below:`,
      ``,
      `Invoice No: ${invoice.id.toUpperCase()}`,
      `Date: ${format(parseISO(invoice.createdAt), "dd MMM yyyy")}`,
      `Grand Total: ₹${invoice.grandTotal.toLocaleString("en-IN")}`,
      ...(balance > 0 && invoice.paymentStatus !== "paid"
        ? [`Balance Due: ₹${balance.toLocaleString("en-IN")}`]
        : ["Status: Paid"]),
      ``,
      `Thank you for your business.`,
      ...(settings.businessName ? [``, settings.businessName] : []),
    ];
    const subject = encodeURIComponent(`Invoice ${invoice.id.toUpperCase()} from ${settings.businessName || "us"}`);
    const body = encodeURIComponent(bodyLines.join("\n"));
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  };

  const totalCgst = invoice.lineItems.reduce((s, l) => s + l.cgst, 0);
  const totalSgst = invoice.lineItems.reduce((s, l) => s + l.sgst, 0);

  return (
    <Dialog open={!!invoice} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between pr-6">
            <div>
              <DialogTitle>Tax Invoice — {invoice.id.toUpperCase()}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(parseISO(invoice.createdAt), "dd MMM yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleWhatsApp}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors shrink-0"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </button>
              <button
                onClick={handleEmail}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0"
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
              >
                <Printer className="h-3.5 w-3.5" />
                Print / PDF
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              {settings.logoBase64 && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logoBase64} alt="logo" className="h-10 max-w-[120px] object-contain" />
              )}
              <div>
                <p className="text-xl font-bold text-primary">{settings.businessName || "Medixor"}</p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{tenant}</p>
                {settings.gstin && <p className="text-xs text-muted-foreground">GSTIN: {settings.gstin}</p>}
                {settings.address && (
                  <p className="text-xs text-muted-foreground whitespace-pre-line">{settings.address}</p>
                )}
                {settings.phone && <p className="text-xs text-muted-foreground">Ph: {settings.phone}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold uppercase tracking-wider">Tax Invoice</p>
              <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${payColors[invoice.paymentStatus] ?? payColors.unpaid}`}>
                {invoice.paymentStatus.charAt(0).toUpperCase() + invoice.paymentStatus.slice(1)}
              </span>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Billed To</p>
              <p className="font-semibold text-sm">{invoice.customerName}</p>
              {invoice.customerGstNumber && (
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">GST: {invoice.customerGstNumber}</p>
              )}
              {invoice.customerLicenseNumber && (
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">License: {invoice.customerLicenseNumber}</p>
              )}
              {invoice.customerAddress && (
                <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{invoice.customerAddress}</p>
              )}
              {settings.showReferenceField && invoice.referredBy && (
                <p className="text-xs text-muted-foreground mt-0.5">Ref: {invoice.referredBy}</p>
              )}
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Invoice Details</p>
              <p className="text-xs text-muted-foreground">Date: {format(parseISO(invoice.createdAt), "dd MMM yyyy")}</p>
              {invoice.dueDate && (
                <p className="text-xs text-muted-foreground mt-0.5">Due: {invoice.dueDate}</p>
              )}
              {invoice.paidAmount > 0 && invoice.paymentStatus !== "paid" && (
                <p className="text-xs text-muted-foreground mt-0.5">Paid: {fmt(invoice.paidAmount)}</p>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  {["#", "Item", "HSN", "Batch", "Expiry", "MRP", "Qty", "Disc", "GST%", "Taxable", "GST Amt", "Total"].map(
                    (h, i) => (
                      <th key={h} className={`px-2 py-2 font-semibold whitespace-nowrap ${i >= 5 ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((l, i) => (
                  <tr key={l.batchId + i} className="border-b border-border/50 even:bg-muted/20">
                    <td className="px-2 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-2 font-medium">{l.itemName}</td>
                    <td className="px-2 py-2 font-mono">{l.hsnCode}</td>
                    <td className="px-2 py-2 font-mono text-muted-foreground">{l.batchNumber}</td>
                    <td className="px-2 py-2 text-muted-foreground">{l.expiryDate}</td>
                    <td className="px-2 py-2 text-right">{fmt(l.mrp)}</td>
                    <td className="px-2 py-2 text-right">{l.quantity}</td>
                    <td className="px-2 py-2 text-right">
                      {l.discountValue
                        ? l.discountType === "percentage"
                          ? l.discountValue + "%"
                          : fmt(l.discountValue)
                        : "—"}
                    </td>
                    <td className="px-2 py-2 text-right">{l.gstRate}%</td>
                    <td className="px-2 py-2 text-right">{fmt(l.taxableAmount)}</td>
                    <td className="px-2 py-2 text-right text-blue-600">{fmt(l.cgst + l.sgst)}</td>
                    <td className="px-2 py-2 text-right font-semibold">{fmt(l.lineTotalWithGst)}</td>
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
                  <td className="py-1 pr-6 text-muted-foreground">Subtotal</td>
                  <td className="py-1 text-right">{fmt(invoice.subtotal)}</td>
                </tr>
                {invoice.customerDiscountAmount > 0 && (
                  <tr>
                    <td className="py-1 pr-6 text-red-600">Discount</td>
                    <td className="py-1 text-right text-red-600">−{fmt(invoice.customerDiscountAmount)}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-1 pr-6 text-muted-foreground">Taxable Amount</td>
                  <td className="py-1 text-right">{fmt(invoice.taxableAmount)}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-6 text-muted-foreground">CGST</td>
                  <td className="py-1 text-right text-blue-600">{fmt(totalCgst)}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-6 text-muted-foreground">SGST</td>
                  <td className="py-1 text-right text-blue-600">{fmt(totalSgst)}</td>
                </tr>
                <tr className="border-t-2 border-primary">
                  <td className="pt-2 pr-6 font-bold text-base text-primary">Grand Total</td>
                  <td className="pt-2 text-right font-bold text-base text-primary">{fmt(invoice.grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

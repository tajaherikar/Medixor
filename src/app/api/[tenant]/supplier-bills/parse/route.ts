import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { createWorker } from "tesseract.js";
import { SupplierBillItem, GstRate } from "@/lib/types";

export const dynamic = 'force-dynamic';

function normalizeHeader(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function objFromCsvLine(headers: string[], values: string[]) {
  const obj: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    obj[normalizeHeader(headers[i])] = (values[i] ?? "").trim();
  }
  return obj;
}

function parseItemObject(raw: Record<string, string | number | boolean>): SupplierBillItem | null {
  const itemName = String(raw.itemName ?? raw.name ?? "").trim();
  if (!itemName) return null;

  const hsnCode = String(raw.hsnCode ?? "").trim();
  const batchNumber = String(raw.batchNumber ?? "").trim();
  const expiryDate = String(raw.expiryDate ?? "").trim();
  const mrp = Number(raw.mrp ?? raw.price ?? 0);
  const purchasePrice = Number(raw.purchasePrice ?? raw.cost ?? mrp ?? 0);
  const quantity = Number(raw.quantity ?? raw.qty ?? 0);
  const gstRate = Number(raw.gstRate ?? raw.gst ?? 0) as GstRate;
  const gstInclusive = raw.gstInclusive === true || String(raw.gstInclusive ?? "").toLowerCase() === "true";

  const taxable = purchasePrice * quantity;
  const gstAmt = taxable * (gstRate / 100);

  return {
    itemName,
    hsnCode,
    batchNumber,
    expiryDate,
    mrp,
    purchasePrice,
    quantity,
    gstRate,
    gstInclusive,
    taxableAmount: taxable,
    cgst: gstAmt / 2,
    sgst: gstAmt / 2,
    lineTotal: taxable + gstAmt,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.formData();
    const file = body.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    let text = "";
    if (file.type === "application/pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const parser = new PDFParse({ data: buffer });
      const pdfTextResult = await parser.getText();
      text = pdfTextResult.text || "";
      await parser.destroy();
    } else if (file.type.startsWith("image/")) {
      const imageBuffer = Buffer.from(await file.arrayBuffer());
      const worker = await createWorker("eng");
      const { data } = await worker.recognize(imageBuffer);
      text = data.text || "";
      await worker.terminate();
    } else {
      const fileText = await file.text();
      text = fileText;
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "No text could be extracted from the file" }, { status: 422 });
    }

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !/^\s*[$*#]/.test(l));

    let items: SupplierBillItem[] = [];

    if (lines.length > 0) {
      // try CSV-like structure
      const first = lines[0];
      const delimiter = first.includes("\t") ? "\t" : first.includes(",") ? "," : ";";
      const header = first.split(delimiter).map((h) => h.trim());
      if (header.length >= 2 && lines.length > 1) {
        items = lines.slice(1).map((line) => {
          const values = line.split(delimiter).map((v) => v.trim());
          const raw = objFromCsvLine(header, values);
          return parseItemObject(raw);
        }).filter((i): i is SupplierBillItem => i !== null);
      }
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "No item data parsed from file" }, { status: 422 });
    }

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

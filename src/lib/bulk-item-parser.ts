/**
 * Bulk Item Parser - Parse tab/comma-separated data from invoices/bills
 * Supports multiple formats and field detection
 */

import { GstRate, UnitType } from "./types";

export interface ParsedItem {
  itemName?: string;
  hsnCode?: string;
  batchNumber?: string;
  expiryDate?: string;
  mrp?: number;
  purchasePrice?: number;
  quantity?: number;
  gstRate?: GstRate;
  unitType?: string;
  packSize?: number;
  schemeQuantity?: number;
  schemePattern?: string;
  _raw?: string; // Original row for debugging
  _errors?: string[]; // Validation errors for this item
}

export interface ParseResult {
  items: ParsedItem[];
  errors: string[];
  warnings: string[];
  successCount: number;
}

// ─── Field Detectors ──────────────────────────────────────────────────────────

const GST_RATES: GstRate[] = [0, 5, 12, 18, 28];

const UNIT_TYPES: UnitType[] = [
  "Tab", "Cap", "SR Tab", "ER Tab", "XR Tab", "CR Tab", "EC Tab", "DT",
  "MD Tab", "Chew Tab", "Eff Tab", "SL Tab", "SF Tab", "Loz", "Gran",
  "Pellets", "Sachet", "Syp", "Susp", "Sol", "Drops", "Eye Drops",
  "Ear Drops", "Nasal Drops", "Nasal Spray", "Mouth Wash", "Inj", "Vial",
  "Amp", "IV Inf", "Cream", "Oint", "Gel", "Lotion", "Dusting Pwd", "Spray",
  "Patch", "Shampoo", "Soap", "MDI", "Rotacap", "Turbuhaler", "Neb Sol",
  "Supp", "Pessary", "Device"
];

/**
 * Detect if a string looks like a date (YYYY-MM-DD, DD/MM/YYYY, etc.)
 */
function isExpiryDate(val: string): boolean {
  if (!val || val.length < 8) return false;
  
  // Formats: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, DD-MM-YY, etc.
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
    /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
    /^\d{2}-\d{2}-\d{2}$/, // DD-MM-YY
  ];
  
  return datePatterns.some(p => p.test(val.trim()));
}

/**
 * Convert date to ISO format (YYYY-MM-DD)
 */
function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  const val = dateStr.trim();
  
  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  
  // DD-MM-YYYY or DD/MM/YYYY
  const match = val.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4}|\d{2})$/);
  if (match) {
    let [, dd, mm, yyyy] = match;
    if (yyyy.length === 2) yyyy = parseInt(yyyy) > 50 ? `19${yyyy}` : `20${yyyy}`;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  
  return null;
}

/**
 * Try to parse a string as a number
 */
function parseNumber(val: any): number | null {
  if (typeof val === 'number') return val > 0 ? val : null;
  if (!val) return null;
  
  const num = parseFloat(String(val).replace(/[₹,]/g, ''));
  return isNaN(num) || num <= 0 ? null : num;
}

/**
 * Detect unit type from item name or explicit field
 */
function detectUnitType(itemName: string, unitField?: string): string | undefined {
  if (unitField) {
    const match = UNIT_TYPES.find(u => u.toLowerCase() === unitField.toLowerCase());
    if (match) return match;
  }
  
  // Search in item name like "Aspirin Tab 500mg"
  const lower = (itemName || '').toLowerCase();
  const found = UNIT_TYPES.find(u => lower.includes(u.toLowerCase()));
  return found;
}

/**
 * Detect GST rate from item name or price field (heuristics)
 */
function detectGstRate(itemName: string, gstField?: string): GstRate | undefined {
  if (gstField) {
    const num = parseNumber(gstField);
    if (num && GST_RATES.includes(num as GstRate)) return num as GstRate;
  }
  
  // Medical items commonly use 5% or 12%
  const lower = (itemName || '').toLowerCase();
  if (lower.includes('device') || lower.includes('strip')) return 5;
  if (lower.includes('injection') || lower.includes('inj')) return 5;
  
  return 12; // Default
}

/**
 * Extract scheme pattern if present (e.g., "10+1" from "10+1" or quantity 10, scheme 1)
 */
function detectScheme(quantityField: string, schemeField?: string): { quantity: number; pattern?: string } | null {
  const qty = String(quantityField).trim();
  
  // Format: "10+1" or "10 + 1"
  if (qty.includes('+')) {
    const [main, scheme] = qty.split('+').map(s => parseNumber(s.trim()));
    if (main && scheme) return { quantity: main, pattern: `${main}+${scheme}` };
  }
  
  // Scheme in separate field
  if (schemeField) {
    const main = parseNumber(quantityField);
    const scheme = parseNumber(schemeField);
    if (main && scheme) return { quantity: main, pattern: `${main}+${scheme}` };
  }
  
  return { quantity: parseNumber(quantityField) || 0 };
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

interface ParserOptions {
  delimiter?: 'auto' | 'tab' | 'comma' | 'space';
  hasHeader?: boolean;
  fieldMapping?: Record<string, number>; // { itemName: 0, batchNumber: 1, ... }
}

/**
 * Parse raw pasted data into structured items
 */
export function parseRawItems(rawText: string, options: ParserOptions = {}): ParseResult {
  const { delimiter = 'auto', hasHeader = false, fieldMapping } = options;
  
  const lines = rawText.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return {
      items: [],
      errors: ['No data provided'],
      warnings: [],
      successCount: 0,
    };
  }
  
  // Detect delimiter if auto
  let delim = '\t'; // Default to tab
  if (delimiter === 'auto') {
    const firstLine = lines[0];
    if (firstLine.split('\t').length > 1) delim = '\t';
    else if (firstLine.split(',').length > 1) delim = ',';
    else delim = /\s{2,}/.test(firstLine) ? ' ' : '\t';
  } else if (delimiter === 'comma') {
    delim = ',';
  } else if (delimiter === 'space') {
    delim = ' ';
  }
  
  // Parse rows
  let startIdx = hasHeader ? 1 : 0;
  const rows = lines.slice(startIdx).map(line => 
    line.split(delim).map(cell => cell.trim()).filter(Boolean)
  );
  
  if (rows.length === 0) {
    return {
      items: [],
      errors: ['No valid rows found after header'],
      warnings: [],
      successCount: 0,
    };
  }
  
  // Parse each row
  const items: ParsedItem[] = [];
  const errors: string[] = [];
  
  rows.forEach((row, idx) => {
    if (row.length === 0) return;
    
    const item: ParsedItem = { _raw: row.join(' | '), _errors: [] };
    
    // Smart field detection if no mapping provided
    if (!fieldMapping) {
      // Attempt: itemName | batchNo | expiry | mrp | cost | qty [| unitType] [| gst]
      if (row.length >= 5) {
        item.itemName = row[0];
        item.batchNumber = row[1];
        item.expiryDate = normalizeDate(row[2]) || row[2];
        item.mrp = parseNumber(row[3]) || 0;
        item.purchasePrice = parseNumber(row[4]) || 0;
        item.quantity = parseNumber(row[5]) || 0;
        
        if (row[6]) item.unitType = detectUnitType(item.itemName || '', row[6]);
        if (row[7]) item.gstRate = detectGstRate(item.itemName || '', row[7]);
      }
    } else {
      // Use provided mapping
      Object.entries(fieldMapping).forEach(([field, colIdx]) => {
        if (colIdx < row.length) {
          const val = row[colIdx];
          switch (field) {
            case 'itemName':
              item.itemName = val;
              break;
            case 'hsnCode':
              item.hsnCode = val;
              break;
            case 'batchNumber':
              item.batchNumber = val;
              break;
            case 'expiryDate':
              item.expiryDate = normalizeDate(val) || val;
              break;
            case 'mrp':
              item.mrp = parseNumber(val) || 0;
              break;
            case 'purchasePrice':
              item.purchasePrice = parseNumber(val) || 0;
              break;
            case 'quantity':
              const scheme = detectScheme(val);
              if (scheme) {
                item.quantity = scheme.quantity;
                item.schemePattern = scheme.pattern;
              }
              break;
            case 'gstRate':
              item.gstRate = detectGstRate(item.itemName || '', val);
              break;
            case 'unitType':
              item.unitType = detectUnitType(item.itemName || '', val);
              break;
            case 'packSize':
              item.packSize = parseNumber(val) || undefined;
              break;
          }
        }
      });
    }
    
    // Validate
    if (!item.itemName) item._errors?.push('Item name missing');
    if (!item.batchNumber) item._errors?.push('Batch number missing');
    if (!item.expiryDate) item._errors?.push('Expiry date missing');
    if (!item.mrp || item.mrp <= 0) item._errors?.push('Invalid MRP');
    if (!item.purchasePrice || item.purchasePrice <= 0) item._errors?.push('Invalid purchase price');
    if (!item.quantity || item.quantity <= 0) item._errors?.push('Invalid quantity');
    
    // Validate date format
    if (item.expiryDate && !isExpiryDate(String(item.expiryDate))) {
      item._errors?.push(`Invalid date format: ${item.expiryDate}`);
    }
    
    item.gstRate = item.gstRate || 12;
    item.unitType = item.unitType || detectUnitType(item.itemName || '');
    
    items.push(item);
    
    if ((item._errors?.length || 0) > 0) {
      errors.push(`Row ${idx + 1}: ${item._errors?.join(', ')}`);
    }
  });
  
  const successCount = items.filter(i => !i._errors || i._errors.length === 0).length;
  
  return {
    items,
    errors,
    warnings: errors.length > 0 ? [`${errors.length} rows have validation errors`] : [],
    successCount,
  };
}

/**
 * Example usage and test data
 */
export const PARSER_EXAMPLES = {
  tab: `Aspirin Tab 500	B001	2025-12-31	150	85	100
Paracetamol Syp 120ml	B002	2025-06-15	200	110	50
Terpin Injection	B003	2026-03-30	280	140	25`,

  comma: `Aspirin Tab, B001, 2025-12-31, 150, 85, 100
Paracetamol Syp, B002, 2025-06-15, 200, 110, 50
Terpin Inj, B003, 2026-03-30, 280, 140, 25`,

  withHeaders: `Item Name	Batch No	Expiry	MRP	Cost	Qty	Unit	GST%
Aspirin Tab 500	B001	2025-12-31	150	85	100	Tab	5
Paracetamol Syp 120ml	B002	2025-06-15	200	110	50	Syp	12
Terpin Injection	B003	2026-03-30	280	140	25	Inj	5`,

  withScheme: `Aspirin Tab	B001	2025-12-31	150	85	10+1
Paracetamol	B002	2025-06-15	200	110	8+2
Vitamin C	B003	2026-03-30	50	30	20`,
};

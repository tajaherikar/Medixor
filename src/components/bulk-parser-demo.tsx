"use client";

/**
 * Bulk Parser Playground - Demo showing how copy-paste parsing works
 * Run this to see real examples and test different formats
 */

import { parseRawItems, PARSER_EXAMPLES } from "@/lib/bulk-item-parser";

export function BulkParserDemo() {
  // Example 1: Tab-separated data (from invoice photo)
  console.log("=== EXAMPLE 1: Tab-Separated Data ===");
  console.log("Input:");
  console.log(PARSER_EXAMPLES.tab);
  
  const result1 = parseRawItems(PARSER_EXAMPLES.tab);
  console.log("\nParsed Output:");
  console.log(result1);
  console.log(`✓ Success: ${result1.successCount}/${result1.items.length} items`);
  console.log("");

  // Example 2: Comma-separated (CSV format)
  console.log("=== EXAMPLE 2: Comma-Separated (CSV) ===");
  console.log("Input:");
  console.log(PARSER_EXAMPLES.comma);
  
  const result2 = parseRawItems(PARSER_EXAMPLES.comma, { delimiter: "comma" });
  console.log("\nParsed Output:");
  console.log(result2);
  console.log(`✓ Success: ${result2.successCount}/${result2.items.length} items`);
  console.log("");

  // Example 3: With headers
  console.log("=== EXAMPLE 3: With Headers ===");
  console.log("Input:");
  console.log(PARSER_EXAMPLES.withHeaders);
  
  const result3 = parseRawItems(PARSER_EXAMPLES.withHeaders, { hasHeader: true });
  console.log("\nParsed Output:");
  console.log(result3);
  console.log(`✓ Success: ${result3.successCount}/${result3.items.length} items`);
  console.log("");

  // Example 4: With scheme quantities (10+1 format)
  console.log("=== EXAMPLE 4: With Scheme Quantities ===");
  console.log("Input:");
  console.log(PARSER_EXAMPLES.withScheme);
  
  const result4 = parseRawItems(PARSER_EXAMPLES.withScheme);
  console.log("\nParsed Output:");
  console.log(result4);
  console.log(`✓ Success: ${result4.successCount}/${result4.items.length} items`);
  console.log("");

  // Show what valid items look like for adding to form
  console.log("=== ITEMS READY FOR FORM ===");
  const validItems = result1.items.filter(i => !i._errors || i._errors.length === 0);
  console.log("These items can be added directly to supplier bill form:");
  console.log(JSON.stringify(validItems, null, 2));

  return null;
}

// Quick test function - can be called from browser console
if (typeof window !== "undefined") {
  (window as any).testBulkParser = () => {
    console.clear();
    console.log("🚀 Testing Bulk Item Parser...\n");

    // Test 1: Perfect tab-separated data
    console.log("TEST 1: Perfect Tab-Separated Data");
    const perfect = `Aspirin Tab 500	B001	2025-12-31	150	85	100
Paracetamol Syp 120ml	B002	2025-06-15	200	110	50
Terpin Injection	B003	2026-03-30	280	140	25`;
    
    const test1 = parseRawItems(perfect);
    console.log(`✓ Input lines: ${perfect.split('\n').length}`);
    console.log(`✓ Parsed items: ${test1.items.length}`);
    console.log(`✓ Valid items: ${test1.successCount}`);
    console.log(`✓ Errors: ${test1.errors.length}`);
    console.table(test1.items.map(i => ({
      Item: i.itemName,
      Batch: i.batchNumber,
      Expiry: i.expiryDate,
      MRP: i.mrp,
      Cost: i.purchasePrice,
      Qty: i.quantity,
    })));
    console.log("");

    // Test 2: Messy data with some errors
    console.log("TEST 2: Messy Data (some errors)");
    const messy = `Aspirin	B001	31-12-2025	150	85	100
	B002	2025-06-15	200	110	50
Terpin Injection	B003	2026-03-30	invalid	140	25`;
    
    const test2 = parseRawItems(messy);
    console.log(`✓ Input lines: ${messy.split('\n').length}`);
    console.log(`✓ Parsed items: ${test2.items.length}`);
    console.log(`✓ Valid items: ${test2.successCount}`);
    console.log(`⚠️ Errors: ${test2.errors.length}`);
    test2.errors.forEach(e => console.log(`   ${e}`));
    console.log("");

    // Test 3: Different date formats
    console.log("TEST 3: Different Date Formats");
    const dates = `Medicine	B001	2025-12-31	150	85	100
Medicine	B002	31/12/2025	150	85	100
Medicine	B003	31-12-2025	150	85	100`;
    
    const test3 = parseRawItems(dates);
    console.log(`✓ Valid items: ${test3.successCount}`);
    console.table(test3.items.map(i => ({
      Expiry: i.expiryDate,
      Valid: !i._errors || i._errors.length === 0 ? '✓' : '✗'
    })));
    console.log("");

    console.log("✨ Parser tests complete! Check items above.");
  };
}

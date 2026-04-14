"use client";

import { useState, useRef } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lightbulb } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  parseRawItems,
  PARSER_EXAMPLES,
  ParsedItem,
  ParseResult,
} from "@/lib/bulk-item-parser";
import { toast } from "sonner";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItems?: (items: ParsedItem[]) => void;
  title?: string;
}

export function BulkImportDialog({
  open,
  onOpenChange,
  onAddItems,
  title = "Bulk Item Import",
}: BulkImportDialogProps) {
  const [rawText, setRawText] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [delimiter, setDelimiter] = useState<"auto" | "tab" | "comma" | "space">("auto");
  const [hasHeader, setHasHeader] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showAdvancedColumns, setShowAdvancedColumns] = useState(false);
  const [showRawAsTable, setShowRawAsTable] = useState(false);
  const [editableRows, setEditableRows] = useState<string[][]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleParse = () => {
    const rowDelimiter = delimiter === "comma" ? "," : delimiter === "space" ? " " : "\t";
    const textToParse = showRawAsTable
      ? editableRows.map((row) => row.join(rowDelimiter)).join("\n")
      : rawText;

    if (!textToParse.trim()) {
      toast.error("Please paste some data");
      return;
    }

    try {
      const result = parseRawItems(textToParse, { delimiter, hasHeader });
      setParseResult(result);

      if (result.successCount === 0 && result.items.length > 0) {
        toast.error(`Failed to parse items. Please check the format.`);
      } else if (result.successCount > 0) {
        toast.success(
          `Parsed ${result.successCount} valid item(s)${result.errors.length > 0 ? `, with ${result.errors.length} error(s)` : ""}`
        );
      }
    } catch (error) {
      toast.error(`Parse error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleAddItems = () => {
    if (!parseResult || parseResult.successCount === 0) {
      toast.error("No valid items to add");
      return;
    }

    const validItems = parseResult.items.filter(item => !item._errors || item._errors.length === 0);
    onAddItems?.(validItems);
    toast.success(`Added ${validItems.length} item(s)`);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setRawText("");
    setParseResult(null);
    setDelimiter("auto");
    setHasHeader(false);
    setShowAdvancedColumns(false);
    setShowRawAsTable(false);
    setEditableRows([]);
  };

  const loadExample = (type: "tab" | "comma" | "withHeaders" | "withScheme") => {
    setRawText(PARSER_EXAMPLES[type]);
    setHasHeader(type === "withHeaders");
  };

  // Parse raw text into rows for table display
  const getRawTableData = () => {
    if (!rawText.trim()) return null;
    
    const lines = rawText.trim().split('\n');
    if (lines.length === 0) return null;

    // Determine delimiter
    let delim = delimiter;
    if (delim === "auto") {
      const firstLine = lines[0];
      if (firstLine.includes('\t')) delim = "tab";
      else if (firstLine.includes(',')) delim = "comma";
      else if (/\s{2,}/.test(firstLine)) delim = "space";
      else delim = "tab";
    }

    const delimiterPattern: string | RegExp = delim === "tab" ? "\t" : delim === "comma" ? "," : /\s{2,}/;
    
    const rows = lines.map(line => 
      line.split(delimiterPattern).map(cell => cell.trim())
    );
    
    return rows;
  };

  // Toggle to table edit mode - parse raw text into editable rows
  const toggleTableEditMode = (enable: boolean) => {
    if (enable) {
      const tableData = getRawTableData();
      if (tableData) {
        setEditableRows(tableData);
      }
    } else {
      // Reconstruct raw text from editable rows using active delimiter
      const activeDelimChar = delimiter === "comma" ? "," : delimiter === "space" ? " " : "\t";
      const reconstructedText = editableRows
        .map(row => row.join(activeDelimChar))
        .join('\n');
      setRawText(reconstructedText);
      setEditableRows([]);
    }
    setShowRawAsTable(enable);
  };

  // Update a cell value in editable rows
  const updateCell = (rowIdx: number, cellIdx: number, value: string) => {
    const newRows = editableRows.map((row, rIdx) => 
      rIdx === rowIdx 
        ? row.map((cell, cIdx) => cIdx === cellIdx ? value : cell)
        : row
    );
    setEditableRows(newRows);
  };

  // Add a new empty row
  const addRow = () => {
    const maxCols = Math.max(...editableRows.map(r => r.length), 6);
    const newRow = Array(maxCols).fill('');
    setEditableRows([...editableRows, newRow]);
  };

  // Delete a row
  const deleteRow = (rowIdx: number) => {
    setEditableRows(editableRows.filter((_, idx) => idx !== rowIdx));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-full !max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Paste tab/comma-separated data from your invoice or bill. Format: Item Name | Batch # |
            Expiry Date | MRP | Cost | Qty
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Paste Data</label>
              <div className="flex gap-2 text-xs">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadExample("tab")}
                  className="h-7"
                >
                  Tab Example
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadExample("comma")}
                  className="h-7"
                >
                  CSV Example
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadExample("withHeaders")}
                  className="h-7"
                >
                  With Headers
                </Button>
              </div>
            </div>
            {showRawAsTable && rawText.trim() ? (
              <div className="space-y-2">
                {/* Editable Raw Table View */}
                <div className="border rounded-lg overflow-x-auto max-h-96 bg-white">
                  <table className="w-full text-xs border-collapse">
                    <tbody>
                      {editableRows.map((row, rowIdx) => (
                        <tr 
                          key={rowIdx} 
                          className={rowIdx % 2 === 0 ? "bg-slate-50" : "bg-white"}
                        >
                          {row.map((cell, cellIdx) => (
                            <td 
                              key={cellIdx}
                              className="border border-slate-200 p-0"
                            >
                              <input
                                type="text"
                                value={cell}
                                onChange={(e) => updateCell(rowIdx, cellIdx, e.target.value)}
                                className="w-full px-2 py-1 text-xs font-mono bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            </td>
                          ))}
                          <td className="border border-slate-200 p-1 bg-slate-100 w-8">
                            <button
                              type="button"
                              onClick={() => deleteRow(rowIdx)}
                              className="text-red-600 hover:text-red-800 font-bold w-full text-center"
                              title="Delete row"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addRow}
                    className="text-xs px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded"
                  >
                    + Add Row
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTableEditMode(false)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    ← Back to Edit
                  </button>
                </div>
              </div>
            ) : (
              <Textarea
                ref={textareaRef}
                placeholder={`Paste data like:\nAspirin Tab\tB001\t2025-12-31\t150\t85\t100\nParacetamol\tB002\t2025-06-15\t200\t110\t50`}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="font-mono text-xs h-40 min-h-[160px] sm:h-48 sm:min-h-[200px]"
              />
            )}
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Delimiter</label>
              <Select value={delimiter} onValueChange={(v: any) => setDelimiter(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="tab">Tab</SelectItem>
                  <SelectItem value="comma">Comma</SelectItem>
                  <SelectItem value="space">Space</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Options</label>
              <div className="flex flex-col gap-2 h-auto">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasHeader}
                    onChange={(e) => setHasHeader(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Has Header Row
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAdvancedColumns}
                    onChange={(e) => setShowAdvancedColumns(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Show Advanced Columns
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRawAsTable}
                    onChange={(e) => toggleTableEditMode(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Show Raw as Table
                </label>
              </div>
            </div>

            <div className="flex items-end gap-2 h-full">
              <Button onClick={handleParse} size="sm" className="flex-1 h-8">
                Parse Data
              </Button>
            </div>
          </div>

          {/* Parse Result - Summary */}
          {parseResult && (
            <>
              <Card className={parseResult.successCount > 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <CardContent className="pt-1">
                  <div className="flex gap-2 items-start">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm">
                        ✓ {parseResult.successCount} valid {parseResult.successCount === 1 ? "item" : "items"}
                        {parseResult.errors.length > 0 && ` · ⚠️ ${parseResult.errors.length} error(s)`}
                      </div>
                      {parseResult.errors.length > 0 && (
                        <ul className="text-xs mt-2 space-y-1">
                          {parseResult.errors.slice(0, 3).map((err, i) => (
                            <li key={i}>• {err}</li>
                          ))}
                          {parseResult.errors.length > 3 && (
                            <li className="text-gray-600">... and {parseResult.errors.length - 3} more</li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Parse Result - Preview Table */}
              {showPreview && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Preview (first 5 items)</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPreview(false)}
                      className="h-6"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="border rounded-md overflow-x-auto max-h-72 sm:max-h-96 overflow-y-auto text-xs">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Item</TableHead>
                          <TableHead className="whitespace-nowrap">Batch</TableHead>
                          <TableHead className="whitespace-nowrap">Expiry</TableHead>
                          <TableHead className="whitespace-nowrap text-right">MRP</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Cost</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Qty</TableHead>
                          {showAdvancedColumns && (
                            <>
                              <TableHead className="whitespace-nowrap">Unit</TableHead>
                              <TableHead className="whitespace-nowrap text-center">GST%</TableHead>
                            </>
                          )}
                          <TableHead className="whitespace-nowrap">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parseResult.items.slice(0, 5).map((item, idx) => {
                          const hasError = (item._errors?.length || 0) > 0;
                          return (
                            <TableRow key={idx} className={hasError ? "bg-red-50" : ""}>
                              <TableCell className="whitespace-nowrap font-medium">{item.itemName}</TableCell>
                              <TableCell className="whitespace-nowrap">{item.batchNumber}</TableCell>
                              <TableCell className="whitespace-nowrap">{item.expiryDate}</TableCell>
                              <TableCell className="whitespace-nowrap text-right">₹{item.mrp}</TableCell>
                              <TableCell className="whitespace-nowrap text-right">₹{item.purchasePrice}</TableCell>
                              <TableCell className="whitespace-nowrap text-right">{item.quantity}</TableCell>
                              {showAdvancedColumns && (
                                <>
                                  <TableCell className="whitespace-nowrap">{item.unitType || "-"}</TableCell>
                                  <TableCell className="whitespace-nowrap text-center">{item.gstRate}%</TableCell>
                                </>
                              )}
                              <TableCell>
                                {hasError ? (
                                  <Badge variant="destructive" className="text-xs">
                                    Error
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-green-50">
                                    ✓
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {!showPreview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(true)}
                  className="w-full h-8"
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Show Preview
                </Button>
              )}
            </>
          )}

          {/* Tips */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex gap-2 items-start">
                <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-900">
                  <strong>Pro tip: </strong> Copy directly from your supplier&apos;s invoice table or paste
                  from Excel. Columns are auto-detected. Include unit type (Tab, Syp, Inj) for better
                  results.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button
            onClick={handleAddItems}
            disabled={!parseResult || parseResult.successCount === 0}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Add {parseResult?.successCount || 0} Item
            {parseResult?.successCount !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

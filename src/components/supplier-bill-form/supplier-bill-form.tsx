"use client";

import { useState, useEffect, useRef, type ChangeEvent, useMemo } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Copy, ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BulkImportDialog } from "@/components/bulk-import-items-dialog";
import { ParsedItem } from "@/lib/bulk-item-parser";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Supplier, GstRate, UnitType, SupplierBill } from "@/lib/types";
import { useAuthStore, useUIStore } from "@/lib/stores";
import { UnsavedChangesModal } from "@/components/ui/unsaved-changes-modal";
import { MedicineNameInput } from "@/components/ui/medicine-name-input";
import { calculateGst } from "@/lib/gst-calculator";
import { 
  fetchLastItemPrices, 
  fetchPreviousBillByInvoiceNumber, 
  fetchLastUsedSupplierId,
  calculateAverageShelfLife,
  calculateEstimatedExpiry,
  checkDuplicateInvoice,
  fetchLastBillFromSupplier
} from "@/lib/api-client";
import { format, parseISO } from "date-fns";

const GST_RATES: GstRate[] = [0, 5, 12, 18, 28];

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const itemSchema = z.object({
  itemName:      z.string().min(1, "Item name required"),
  hsnCode:       z.string().optional(),
  batchNumber:   z.string().min(1, "Batch number required"),
  expiryDate:    z
    .string()
    .min(1, "Expiry date required")
    .refine((val) => {
      // Validate YYYY-MM format
      if (!val || !/^\d{4}-\d{2}$/.test(val)) return false;
      const [year, month] = val.split("-").map(Number);
      // Check if the month is in the future
      // month from input is 1-indexed (01-12), Date constructor uses 0-indexed (0-11)
      const expiryMonthStart = new Date(year, month - 1, 1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return expiryMonthStart > today;
    }, { message: "Expiry month must be in the future" }),
  mrp:           z.number({ error: "MRP must be > 0" }).positive("MRP must be > 0"),
  purchasePrice: z.number({ error: "Purchase price must be > 0" }).positive("Purchase price must be > 0"),
  quantity:      z.number({ error: "Quantity must be > 0" }).int().positive("Quantity must be > 0"),
  gstRate:       z.number(),
  gstInclusive:  z.boolean().optional(),
  unitType:      z.string().optional(),
  packSize:      z.number().int().positive().optional(),
  schemeQuantity: z.number().int().nonnegative("Scheme quantity must be >= 0").optional(),
  schemePattern: z.string().optional(),
});

const billSchema = z.object({
  supplierId:    z.string().min(1, "Select a supplier"),
  invoiceNumber: z.string().min(1, "Invoice number required"),
  date:          z.string().min(1, "Date required"),
  items:         z.array(itemSchema).min(1, "Add at least one item"),
});

type BillFormValues = z.infer<typeof billSchema>;

const emptyItem = {
  itemName: "",
  hsnCode: "",
  batchNumber: "",
  expiryDate: "",
  mrp: 0,
  purchasePrice: 0,
  quantity: 0,
  gstRate: 12,
  gstInclusive: false,
  unitType: "",
  packSize: undefined as number | undefined,
  schemeQuantity: 0,
  schemePattern: "" as string,
};

function rupees(n: number) {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}

interface SupplierBillFormProps {
  tenant: string;
  onSuccess?: () => void;
  billId?: string;
  initialBill?: SupplierBill;
}

export function SupplierBillForm({ tenant, onSuccess, billId, initialBill }: SupplierBillFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [duplicateInvoice, setDuplicateInvoice] = useState<{ id: string; date: string } | null>(null);
  const [lastBillFromSupplier, setLastBillFromSupplier] = useState<SupplierBill | null>(null);
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const isEditing = !!billId && !!initialBill;

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["suppliers", tenant],
    queryFn: async () => {
      const res = await fetch(`/api/${tenant}/suppliers`);
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      return res.json();
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch existing inventory item names for autocomplete suggestions
  const { data: inventoryItemNames = [] } = useQuery<{ itemName: string }[], Error, string[]>({
    queryKey: ["inventory-names", tenant],
    queryFn: async () => {
      const res = await fetch(`/api/${tenant}/inventory`);
      if (!res.ok) return [];
      return res.json();
    },
    select: (data) =>
      Array.from(new Set(data.map((b) => b.itemName))),
    staleTime: 60_000,
  });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues: isEditing && initialBill ? {
      supplierId: initialBill.supplierId,
      invoiceNumber: initialBill.invoiceNumber,
      date: initialBill.date,
      items: initialBill.items.map(item => ({
        itemName: item.itemName,
        hsnCode: item.hsnCode,
        batchNumber: item.batchNumber,
        // Convert old full date format (YYYY-MM-DD) to new YYYY-MM format
        expiryDate: item.expiryDate ? item.expiryDate.substring(0, 7) : "",
        mrp: item.mrp,
        purchasePrice: item.purchasePrice,
        quantity: item.quantity,
        gstRate: item.gstRate as GstRate,
        gstInclusive: item.gstInclusive,
        unitType: item.unitType,
        packSize: item.packSize,
        schemeQuantity: item.schemeQuantity ?? 0,
        schemePattern: item.schemePattern ?? "",
      })),
    } : {
      supplierId: "",
      invoiceNumber: "",
      date: new Date().toISOString().split("T")[0],
      items: [emptyItem],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = useWatch({ control, name: "items" });
  const watchedSupplierId = useWatch({ control, name: "supplierId" });
  const selectedSupplier = suppliers.find((s) => s.id === watchedSupplierId);

  // Browser beforeunload warning for unsaved changes
  useEffect(() => {
    if (!isDirty || submitted) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, submitted]);

  // Pre-fill supplier with last used supplier on initial form load (only for new bills)
  useEffect(() => {
    if (isEditing || watchedSupplierId) return; // Skip if editing or already selected
    
    const prefilLastSupplier = async () => {
      try {
        const lastSupplierId = await fetchLastUsedSupplierId(tenant);
        if (lastSupplierId) {
          setValue("supplierId", lastSupplierId);
        }
      } catch (error) {
        console.error("Failed to fetch last used supplier:", error);
      }
    };

    prefilLastSupplier();
  }, [isEditing, tenant, watchedSupplierId, setValue]);

  // Handle invoice number change - smart lookup for repeated invoices + duplicate detection
  const handleInvoiceNumberChange = async (invoiceNumber: string) => {
    setValue("invoiceNumber", invoiceNumber);

    // Only lookup if invoice number is long enough (at least 3 chars)
    if (invoiceNumber.length < 3) {
      setDuplicateInvoice(null);
      return;
    }

    // Get current supplier for context
    const currentSupplierId = watchedSupplierId;
    if (!currentSupplierId) {
      setDuplicateInvoice(null);
      return; // Supplier must be selected first
    }

    try {
      // Check for duplicate invoice
      const duplicate = await checkDuplicateInvoice(invoiceNumber, currentSupplierId, tenant, billId);
      setDuplicateInvoice(duplicate);

      // Always try to fetch and fill the date from last purchase with this invoice number
      // (whether it's a duplicate or not)
      const previousBill = await fetchPreviousBillByInvoiceNumber(invoiceNumber, tenant);
      if (previousBill && previousBill.supplierId === currentSupplierId) {
        setValue("date", previousBill.date);
        
        // Show appropriate toast message
        if (duplicate) {
          toast.warning("Duplicate invoice detected - date from previous entry", {
            duration: 2500,
          });
        } else {
          toast.success("Found previous bill - date auto-filled", {
            duration: 2000,
          });
        }
      }
    } catch (error) {
      console.error("Failed to lookup invoice number:", error);
      setDuplicateInvoice(null);
    }
  };

  // Load last bill from supplier when supplier is selected (for repeat order feature)
  useEffect(() => {
    if (!watchedSupplierId || isEditing) return;

    const loadLastBill = async () => {
      try {
        const lastBill = await fetchLastBillFromSupplier(watchedSupplierId, tenant);
        setLastBillFromSupplier(lastBill);
      } catch (error) {
        console.error("Failed to load last bill from supplier:", error);
      }
    };

    loadLastBill();
  }, [watchedSupplierId, tenant, isEditing]);

  // Handle repeat last order - clone the last bill items
  const handleRepeatLastOrder = async () => {
    if (!lastBillFromSupplier) return;

    // Remove empty first item if present
    if (fields.length === 1 && !fields[0]?.itemName) {
      remove(0);
    }

    // Add all items from last bill
    lastBillFromSupplier.items.forEach((item) => {
      append({
        itemName: item.itemName,
        hsnCode: item.hsnCode,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        mrp: item.mrp,
        purchasePrice: item.purchasePrice,
        quantity: item.quantity,
        gstRate: item.gstRate,
        gstInclusive: item.gstInclusive,
        unitType: item.unitType,
        packSize: item.packSize,
        schemeQuantity: item.schemeQuantity,
        schemePattern: item.schemePattern,
      });
    });

    toast.success(`Added ${lastBillFromSupplier.items.length} items from last order`, {
      duration: 2000,
    });
  };

  // Live totals — using centralized GST calculator
  const itemTotals = useMemo(() => {
    return (watchedItems ?? []).map((item) => {
      const qty = item.quantity || 0;
      const price = item.purchasePrice || 0;
      const gross = price * qty;

      const gst = calculateGst(gross, (item.gstRate || 0) as GstRate, item.gstInclusive ?? false);
      return { taxable: gst.taxable, cgst: gst.cgst, sgst: gst.sgst, lineTotal: gst.taxable + gst.gstAmount };
    });
  }, [watchedItems]);
  const billTaxable = itemTotals.reduce((s, i) => s + i.taxable, 0);
  const billGst = itemTotals.reduce((s, i) => s + i.cgst + i.sgst, 0);
  const billTotal = billTaxable + billGst;

  // Handle bulk item import from parsed data
  const handleBulkAddItems = (parsedItems: ParsedItem[]) => {
    const currentLength = fields.length;
    const hasEmptyItem = fields[0]?.itemName === "";

    // Remove the empty first item if it's the only one
    if (hasEmptyItem && currentLength === 1) {
      remove(0);
    }

    // Map parsed items to form structure
    const itemsToAdd = parsedItems.map((item) => ({
      itemName: item.itemName || "",
      hsnCode: item.hsnCode || "",
      batchNumber: item.batchNumber || "",
      expiryDate: item.expiryDate || "",
      mrp: item.mrp || 0,
      purchasePrice: item.purchasePrice || 0,
      quantity: item.quantity || 0,
      gstRate: item.gstRate || 12,
      gstInclusive: false,
      unitType: item.unitType || "",
      packSize: item.packSize || undefined,
      schemeQuantity: item.schemeQuantity || 0,
      schemePattern: item.schemePattern || "",
    }));

    // Add all items to form in a single call to avoid multiple re-renders
    append(itemsToAdd);

    // Success feedback
    setShowBulkImport(false);
    toast.success(`Added ${itemsToAdd.length} items`, {
      description: "Items added to the form. Verify details before saving.",
      duration: 3000,
    });
  };

  const toggleItemExpanded = (fieldId: string) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(fieldId)) {
      newSet.delete(fieldId);
    } else {
      newSet.add(fieldId);
    }
    setExpandedItems(newSet);
  };

  // Handle item name selection with auto-population of prices and expiry estimation
  const handleItemNameChange = async (itemName: string, index: number) => {
    // Set the item name
    setValue(`items.${index}.itemName`, itemName);

    // If item name is long enough to be a real selection (not just typing)
    if (itemName.length > 2) {
      try {
        // Fetch the last purchase prices for this item
        const lastPrices = await fetchLastItemPrices(itemName, tenant);
        if (lastPrices) {
          // Auto-populate MRP and Purchase Price
          setValue(`items.${index}.mrp`, lastPrices.mrp);
          setValue(`items.${index}.purchasePrice`, lastPrices.purchasePrice);
          
          // Show subtle feedback
          toast.success("Prices auto-filled from last purchase", {
            duration: 2000,
          });
        }

        // Try to estimate expiry date based on shelf life from same supplier
        if (watchedSupplierId) {
          const shelfLifeDays = await calculateAverageShelfLife(itemName, watchedSupplierId, tenant);
          if (shelfLifeDays) {
            const orderDate = watchedItems?.[0]?.expiryDate
              ? new Date().toISOString().split("T")[0]
              : watchedItems?.[index]?.expiryDate || new Date().toISOString().split("T")[0];
            
            const estimatedExpiry = calculateEstimatedExpiry(orderDate, shelfLifeDays);
            
            // Only auto-fill if expiry date is not already set
            if (!watchedItems?.[index]?.expiryDate) {
              setValue(`items.${index}.expiryDate`, estimatedExpiry);
              toast.info(`Expiry estimated: ${estimatedExpiry} (${shelfLifeDays} days shelf life)`, {
                duration: 3000,
              });
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch item data:", error);
        // Silent fail - don't interrupt user flow
      }
    }
  };

  async function onSubmit(data: BillFormValues) {
    const supplier = suppliers.find((s) => s.id === data.supplierId);

    const enrichedItems = data.items.map((item) => {
      const qty = item.quantity;
      const price = item.purchasePrice;
      const gross = price * qty;

      const gst = calculateGst(gross, item.gstRate as GstRate, item.gstInclusive ?? false);

      return {
        ...item,
        hsnCode: item.hsnCode ?? "",
        taxableAmount: gst.taxable,
        cgst: gst.cgst,
        sgst: gst.sgst,
        lineTotal: gst.taxable + gst.gstAmount,
      };
    });

    const taxableAmount = enrichedItems.reduce((s, i) => s + i.taxableAmount, 0);
    const totalGst = enrichedItems.reduce((s, i) => s + i.cgst + i.sgst, 0);

    // Calculate dueDate (30 days from bill date)
    const billDate = new Date(data.date);
    const dueDate = new Date(billDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const basePayload = {
      ...data,
      items: enrichedItems,
      supplierName: supplier?.name ?? "",
      ...(supplier?.gstNumber && { supplierGstNumber: supplier.gstNumber }),
      ...(supplier?.licenseNumber && { supplierLicenseNumber: supplier.licenseNumber }),
      ...(supplier?.address && { supplierAddress: supplier.address }),
      tenantId: tenant,
      dueDate: dueDate.toISOString().split('T')[0],
      taxableAmount,
      totalGst,
      grandTotal: taxableAmount + totalGst,
    };

    // For create - add metadata
    const createPayload = {
      ...basePayload,
      paymentStatus: initialBill?.paymentStatus ?? "unpaid",
      paidAmount: initialBill?.paidAmount ?? 0,
      createdAt: initialBill?.createdAt ?? new Date().toISOString(),
    };

    // For update - preserve payment status and metadata, update bill details
    const updatePayload = {
      ...basePayload,
      paymentStatus: initialBill?.paymentStatus,
      paidAmount: initialBill?.paidAmount,
      createdAt: initialBill?.createdAt,
      dueDate: initialBill?.dueDate ?? basePayload.dueDate,
    };

    const payload = isEditing ? updatePayload : createPayload;
    const method = isEditing ? "PUT" : "POST";
    const url = isEditing 
      ? `/api/${tenant}/supplier-bills/${billId}`
      : `/api/${tenant}/supplier-bills`;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = typeof err.error === "string" ? err.error : (err.message ?? res.statusText);
      toast.error(`Failed to ${isEditing ? 'update' : 'save'} bill`, {
        description: msg,
        duration: 5000,
      });
      return;
    }
    toast.success(`Bill ${isEditing ? 'updated' : 'saved'} successfully`, {
      description: `Invoice ${payload.invoiceNumber}`,
      duration: 3000,
    });
    setSubmitted(true);
    setTimeout(() => {
      reset();
      setSubmitted(false);
      setDuplicateInvoice(null);
      setLastBillFromSupplier(null);
      onSuccess?.();
    }, 1500);
  }

  return (
    <div className={isFullscreen ? "fixed inset-0 z-50 bg-background overflow-auto" : ""}>
      <form onSubmit={handleSubmit(onSubmit)} className={`space-y-6 ${isFullscreen ? 'p-6' : ''}`}>
        {/* Fullscreen Header */}
        {isFullscreen && (
          <div className="sticky top-0 bg-background border-b border-border pb-4 mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{isEditing ? 'Edit' : 'Record'} Supplier Bill</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Full screen entry mode</p>
            </div>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
              title="Exit fullscreen"
            >
              <Minimize2 className="h-4 w-4" />
              <span className="text-sm font-medium">Exit</span>
            </button>
          </div>
        )}

        {/* Last Edited Info - only for editing */}
        {isEditing && initialBill?.editedAt && (
          <p className="text-xs text-muted-foreground">
            Last Edited: {format(parseISO(initialBill.editedAt), "dd MMM yyyy, hh:mm a")}
          </p>
        )}

        {/* Duplicate Invoice Warning Banner */}
        {duplicateInvoice && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">⚠️ Duplicate Invoice Detected</p>
              <p className="text-xs text-amber-800 mt-1">
                This invoice number was already entered on {format(parseISO(duplicateInvoice.date), "dd MMM yyyy")}
              </p>
            </div>
          </div>
        )}

        {/* Header Fields */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <h3 className="text-base font-semibold">Supplier Details</h3>
            <div className="flex items-center gap-2 ml-auto">
              {!isEditing && lastBillFromSupplier && (
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline"
                  onClick={handleRepeatLastOrder}
                  className="gap-2"
                  title="Clone all items from last order"
                >
                  <Copy className="h-4 w-4" /> Repeat Last Order
                </Button>
              )}
              {!isFullscreen && (
                <button
                  type="button"
                  onClick={() => setIsFullscreen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                  title="Enter fullscreen mode"
                >
                  <Maximize2 className="h-4 w-4" />
                  <span className="text-sm font-medium hidden sm:inline">Fullscreen</span>
                </button>
              )}
            </div>
          </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4">
          {/* Supplier */}
          <div className="space-y-1">
            <Label>Supplier</Label>
            <Select value={watchedSupplierId} onValueChange={(v) => setValue("supplierId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.supplierId && <p className="text-xs text-destructive">{errors.supplierId.message}</p>}
            {selectedSupplier && (selectedSupplier.gstNumber || selectedSupplier.licenseNumber || selectedSupplier.address) && (
              <div className="flex flex-wrap gap-3 mt-1">
                {selectedSupplier.gstNumber && (
                  <span className="text-xs text-muted-foreground">
                    GST: <span className="font-mono font-medium text-foreground">{selectedSupplier.gstNumber}</span>
                  </span>
                )}
                {selectedSupplier.licenseNumber && (
                  <span className="text-xs text-muted-foreground">
                    License: <span className="font-mono font-medium text-foreground">{selectedSupplier.licenseNumber}</span>
                  </span>
                )}
                {selectedSupplier.address && (
                  <span className="text-xs text-muted-foreground">{selectedSupplier.address}</span>
                )}
              </div>
            )}
          </div>

          {/* Invoice Number */}
          <div className="space-y-1">
            <Label>Invoice Number</Label>
            <Controller
              control={control}
              name="invoiceNumber"
              render={({ field }) => (
                <Input 
                  placeholder="INV-001" 
                  value={field.value}
                  onChange={(e) => handleInvoiceNumberChange(e.target.value)}
                  onBlur={field.onBlur}
                />
              )}
            />
            {errors.invoiceNumber && <p className="text-xs text-destructive">{errors.invoiceNumber.message}</p>}
          </div>

          {/* Date */}
          <div className="space-y-1">
            <Label>Date</Label>
            <Input type="date" {...register("date")} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <h3 className="text-base font-semibold">Items</h3>
          <Button type="button" size="sm" variant="outline" onClick={() => setShowBulkImport(true)} className="gap-2">
            <Copy className="h-4 w-4" /> Bulk Import
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => {
            const t = itemTotals[index];
            const isExpanded = expandedItems.has(field.id);
            return (
              <div key={field.id} className="border rounded-lg p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                {/* Item Header - Always Visible */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">
                      {watchedItems?.[index]?.itemName || "(No item name)"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Batch: {watchedItems?.[index]?.batchNumber || "-"} • Exp: {watchedItems?.[index]?.expiryDate ? watchedItems[index]!.expiryDate : "-"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleItemExpanded(field.id)}
                      className="h-8 w-8 p-0"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Core Fields - Always Visible */}
                <div className="space-y-4">
                  {/* Row 1: Item Name, Batch, Expiry */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Item Name *</Label>
                      <Controller
                        control={control}
                        name={`items.${index}.itemName`}
                        render={({ field }) => (
                          <MedicineNameInput
                            ref={field.ref}
                            name={field.name}
                            value={field.value}
                            onChange={(itemName) => handleItemNameChange(itemName, index)}
                            onBlur={field.onBlur}
                            inventoryNames={inventoryItemNames}
                            placeholder="e.g., Paracetamol 500mg"
                          />
                        )}
                      />
                      {errors.items?.[index]?.itemName && <p className="text-xs text-destructive">{errors.items[index]!.itemName!.message}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">HSN Code <span className="text-muted-foreground">(opt)</span></Label>
                      <Input placeholder="30049099" {...register(`items.${index}.hsnCode`)} className="text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Batch Number *</Label>
                      <Input placeholder="PCM-2025-A" {...register(`items.${index}.batchNumber`)} className="text-sm" />
                      {errors.items?.[index]?.batchNumber && <p className="text-xs text-destructive">{errors.items[index]!.batchNumber!.message}</p>}
                    </div>
                  </div>

                  {/* Row 2: Expiry, MRP, Cost */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Expiry Date *</Label>
                      <Controller
                        control={control}
                        name={`items.${index}.expiryDate`}
                        render={({ field }) => (
                          <Input
                            type="month"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                            placeholder="mm/yyyy"
                            onBlur={field.onBlur}
                            className="text-sm"
                          />
                        )}
                      />
                      {errors.items?.[index]?.expiryDate && <p className="text-xs text-destructive">{errors.items[index]!.expiryDate!.message}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">MRP (₹) *</Label>
                      <Input type="number" step="0.01" placeholder="0" {...register(`items.${index}.mrp`, { valueAsNumber: true })} className="text-sm" />
                      {errors.items?.[index]?.mrp && <p className="text-xs text-destructive">{errors.items[index]!.mrp!.message}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Purchase Price (₹) *</Label>
                      <Input type="number" step="0.01" placeholder="0" {...register(`items.${index}.purchasePrice`, { valueAsNumber: true })} className="text-sm" />
                      {errors.items?.[index]?.purchasePrice && <p className="text-xs text-destructive">{errors.items[index]!.purchasePrice!.message}</p>}
                    </div>
                  </div>

                  {/* Row 3: Quantity & Totals */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Quantity *</Label>
                      <Input type="number" placeholder="100" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="text-sm" />
                      {errors.items?.[index]?.quantity && <p className="text-xs text-destructive">{errors.items[index]!.quantity!.message}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Total Received</Label>
                      <div className="h-10 bg-slate-100 px-3 rounded border border-slate-200 flex items-center text-sm font-medium text-muted-foreground cursor-not-allowed">
                        {(watchedItems?.[index]?.quantity ?? 0)} + {(watchedItems?.[index]?.schemeQuantity ?? 0)} = {(watchedItems?.[index]?.quantity ?? 0) + (watchedItems?.[index]?.schemeQuantity ?? 0)} units
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Line Total</Label>
                      <div className="h-10 bg-slate-100 px-3 rounded border border-slate-200 flex items-center text-sm font-semibold text-blue-600 cursor-not-allowed">
                        {rupees(t?.lineTotal ?? 0)}
                      </div>
                    </div>
                  </div>

                  {/* Tax Section - Always Visible */}
                  <div className="bg-blue-50 p-3 rounded border border-blue-200 space-y-3">
                    <div className="text-xs font-semibold text-blue-900">Tax & Calculation</div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs font-medium">GST Rate (%)</Label>
                        <Select
                          value={String(watchedItems?.[index]?.gstRate || emptyItem.gstRate)}
                          onValueChange={(v) => setValue(`items.${index}.gstRate`, Number(v))}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GST_RATES.map((r) => (
                              <SelectItem key={r} value={String(r)}>{r}%</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <label className="flex items-center gap-2 text-xs cursor-pointer mt-6">
                        <input
                          type="checkbox"
                          checked={Boolean(watchedItems?.[index]?.gstInclusive)}
                          onChange={(e) => setValue(`items.${index}.gstInclusive`, e.target.checked)}
                          className="h-4 w-4 rounded"
                        />
                        <span className="font-medium">Inclusive GST</span>
                      </label>
                    </div>
                    <div className="text-xs text-blue-900 bg-blue-100 p-2 rounded border border-blue-300">
                      Taxable: {rupees(t?.taxable ?? 0)} + GST: {rupees((t?.cgst ?? 0) + (t?.sgst ?? 0))} = <strong>{rupees(t?.lineTotal ?? 0)}</strong>
                    </div>
                  </div>

                  {/* Advanced Section - Collapsible */}
                  {isExpanded && (
                    <div className="pt-3 border-t space-y-4">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">Advanced Options</div>

                      {/* Unit Type & Pack Size */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Unit Type <span className="text-muted-foreground">(opt)</span></Label>
                          <Select
                            value={watchedItems?.[index]?.unitType || ""}
                            onValueChange={(v) => setValue(`items.${index}.unitType`, v as UnitType)}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="e.g., Tab" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectLabel>Solid / Oral Solid</SelectLabel>
                                <SelectItem value="Tab">Tab — Tablet</SelectItem>
                                <SelectItem value="Cap">Cap — Capsule</SelectItem>
                                <SelectItem value="SR Tab">SR Tab — Sustained Release</SelectItem>
                                <SelectItem value="ER Tab">ER Tab — Extended Release</SelectItem>
                                <SelectItem value="XR Tab">XR Tab — Extended Release (XR)</SelectItem>
                                <SelectItem value="CR Tab">CR Tab — Controlled Release</SelectItem>
                                <SelectItem value="EC Tab">EC Tab — Enteric Coated</SelectItem>
                                <SelectItem value="DT">DT — Dispersible Tablet</SelectItem>
                                <SelectItem value="MD Tab">MD Tab — Mouth Dissolving</SelectItem>
                                <SelectItem value="Chew Tab">Chew Tab — Chewable</SelectItem>
                                <SelectItem value="Eff Tab">Eff Tab — Effervescent</SelectItem>
                                <SelectItem value="SL Tab">SL Tab — Sub-Lingual</SelectItem>
                                <SelectItem value="SF Tab">SF Tab — Sugar Free</SelectItem>
                                <SelectItem value="Loz">Loz — Lozenge</SelectItem>
                                <SelectItem value="Gran">Gran — Granules</SelectItem>
                                <SelectItem value="Pellets">Pellets — Sprinkles</SelectItem>
                                <SelectItem value="Sachet">Sachet</SelectItem>
                              </SelectGroup>
                              <SelectGroup>
                                <SelectLabel>Liquid</SelectLabel>
                                <SelectItem value="Syp">Syp — Syrup</SelectItem>
                                <SelectItem value="Susp">Susp — Suspension</SelectItem>
                                <SelectItem value="Sol">Sol — Solution</SelectItem>
                                <SelectItem value="Drops">Drops — Oral Drops</SelectItem>
                                <SelectItem value="Eye Drops">Eye Drops</SelectItem>
                                <SelectItem value="Ear Drops">Ear Drops</SelectItem>
                                <SelectItem value="Nasal Drops">Nasal Drops</SelectItem>
                                <SelectItem value="Nasal Spray">Nasal Spray</SelectItem>
                                <SelectItem value="Mouth Wash">Mouth Wash</SelectItem>
                              </SelectGroup>
                              <SelectGroup>
                                <SelectLabel>Injectable</SelectLabel>
                                <SelectItem value="Inj">Inj — Injection</SelectItem>
                                <SelectItem value="Vial">Vial</SelectItem>
                                <SelectItem value="Amp">Amp — Ampoule</SelectItem>
                                <SelectItem value="IV Inf">IV Inf — IV Infusion</SelectItem>
                              </SelectGroup>
                              <SelectGroup>
                                <SelectLabel>Topical / External</SelectLabel>
                                <SelectItem value="Cream">Cream</SelectItem>
                                <SelectItem value="Oint">Oint — Ointment</SelectItem>
                                <SelectItem value="Gel">Gel</SelectItem>
                                <SelectItem value="Lotion">Lotion</SelectItem>
                                <SelectItem value="Dusting Pwd">Dusting Pwd — Dusting Powder</SelectItem>
                                <SelectItem value="Spray">Spray — Topical/Throat</SelectItem>
                                <SelectItem value="Patch">Patch — Transdermal</SelectItem>
                                <SelectItem value="Shampoo">Shampoo — Medicated</SelectItem>
                                <SelectItem value="Soap">Soap — Medicated</SelectItem>
                              </SelectGroup>
                              <SelectGroup>
                                <SelectLabel>Respiratory</SelectLabel>
                                <SelectItem value="MDI">MDI — Metered Dose Inhaler</SelectItem>
                                <SelectItem value="Rotacap">Rotacap — Rotahaler Capsule</SelectItem>
                                <SelectItem value="Turbuhaler">Turbuhaler</SelectItem>
                                <SelectItem value="Neb Sol">Neb Sol — Nebulization Solution</SelectItem>
                              </SelectGroup>
                              <SelectGroup>
                                <SelectLabel>Other</SelectLabel>
                                <SelectItem value="Supp">Supp — Suppository</SelectItem>
                                <SelectItem value="Pessary">Pessary — Vaginal Pessary</SelectItem>
                                <SelectItem value="Device">Device — Medical Device</SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Pack Size <span className="text-muted-foreground">(opt)</span></Label>
                          <Input type="number" min={1} placeholder="e.g., 10" {...register(`items.${index}.packSize`, { valueAsNumber: true })} className="text-sm" />
                          <p className="text-xs text-muted-foreground">Units per strip/bottle</p>
                        </div>
                      </div>

                      {/* Scheme Section */}
                      <div className="bg-amber-50 p-3 rounded border border-amber-200 space-y-3">
                        <div className="text-xs font-semibold text-amber-900">Scheme Info</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Scheme Qty (Free Items) <span className="text-muted-foreground">(opt)</span></Label>
                            <Input type="number" min={0} placeholder="1" {...register(`items.${index}.schemeQuantity`, { valueAsNumber: true })} className="text-sm" />
                            <p className="text-xs text-muted-foreground">e.g., 1 in 10+1</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Scheme Pattern <span className="text-muted-foreground">(opt)</span></Label>
                            <Input type="text" placeholder="10+1, 10+5" {...register(`items.${index}.schemePattern`)} className="text-sm" />
                            <p className="text-xs text-muted-foreground">Pattern for reference</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Bill Totals */}
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg p-4 border border-slate-200">
            <div className="flex flex-col items-end gap-2 text-sm">
              <div className="flex gap-8">
                <span className="text-muted-foreground">Taxable Amount</span>
                <span className="w-28 text-right font-medium">{rupees(billTaxable)}</span>
              </div>
              <div className="flex gap-8">
                <span className="text-muted-foreground">Total GST (CGST + SGST)</span>
                <span className="w-28 text-right text-blue-600 font-medium">{rupees(billGst)}</span>
              </div>
              <div className="flex gap-8 font-semibold text-base pt-1 border-t w-full justify-end pr-0">
                <span>Grand Total</span>
                <span className="w-28 text-right text-lg text-blue-700">{rupees(billTotal)}</span>
              </div>
            </div>
          </div>

          {/* Add Item Button at Bottom */}
          <div className="flex gap-2 pt-2">
            <Button type="button" size="sm" variant="outline" onClick={() => append(emptyItem)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting || submitted || !isAdmin} className="w-full sm:w-auto"
        title={!isAdmin ? "Admin access required" : undefined}>
        {submitted ? (isEditing ? "Bill Updated ✓" : "Bill Saved ✓") : isSubmitting ? (isEditing ? "Updating..." : "Saving...") : (isEditing ? "Update Bill" : "Save Supplier Bill")}
      </Button>

      <BulkImportDialog
        open={showBulkImport}
        onOpenChange={setShowBulkImport}
        onAddItems={handleBulkAddItems}
        title="Bulk Import Items from Invoice"
      />

        <UnsavedChangesModal
          open={showUnsavedModal}
          onSave={() => {
            setShowUnsavedModal(false);
            handleSubmit(onSubmit)();
          }}
          onDiscard={() => {
            setShowUnsavedModal(false);
            reset();
            setDuplicateInvoice(null);
            setLastBillFromSupplier(null);
          }}
          title="Unsaved Bill"
          description="You have unsaved changes to this supplier bill. Save before leaving?"
        />
      </form>
    </div>
  );
}

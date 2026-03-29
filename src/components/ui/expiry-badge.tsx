import { parseISO, differenceInDays, format } from "date-fns";
import { CalendarCheck2, CalendarX2, AlertCircle } from "lucide-react";
import { InventoryStatus } from "@/lib/types";
import { getInventoryStatus } from "@/lib/batch-logic";
import { cn } from "@/lib/utils";

interface ExpiryBadgeProps {
  expiryDate: string;  // ISO date string
  showRelative?: boolean;
}

export function ExpiryBadge({ expiryDate, showRelative = true }: ExpiryBadgeProps) {
  const status: InventoryStatus = getInventoryStatus(expiryDate);
  const expiry = parseISO(expiryDate);
  const today = new Date();
  const daysLeft = differenceInDays(expiry, today);
  const formatted = format(expiry, "dd MMM yyyy");

  if (status === "expired") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
        <CalendarX2 className="h-3 w-3 shrink-0" />
        <span>{formatted}</span>
        <span className="text-red-400 font-normal">· Expired</span>
      </span>
    );
  }

  if (status === "near_expiry") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <AlertCircle className="h-3 w-3 shrink-0" />
        <span>{formatted}</span>
        {showRelative && (
          <span className="text-amber-500 font-normal">· {daysLeft}d left</span>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
      <CalendarCheck2 className="h-3 w-3 shrink-0" />
      <span>{formatted}</span>
      {showRelative && daysLeft <= 365 && (
        <span className="text-teal-500 font-normal">· {daysLeft}d</span>
      )}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const statusStyles: Record<InventoryStatus, { label: string; className: string; dot: string }> = {
  active:      { label: "Active",      className: "bg-teal-50  text-teal-700  border-teal-200",  dot: "bg-teal-500" },
  near_expiry: { label: "Near Expiry", className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  expired:     { label: "Expired",     className: "bg-red-50   text-red-700   border-red-200",   dot: "bg-red-500" },
};

interface StatusBadgeProps {
  status: InventoryStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className, dot } = statusStyles[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border", className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
      {label}
    </span>
  );
}

import { getDoctorTargetBreakdown } from "@/lib/doctor-target";
import { IndianRupee, TrendingUp } from "lucide-react";

interface DoctorTargetCardProps {
  allocatedAmount: number;
  targetPercentage: number;
  compact?: boolean;
}

/**
 * Display card showing doctor's sales target calculation
 * Shows: Amount × (1 + Growth %) = Target sales
 */
export function DoctorTargetCard({
  allocatedAmount,
  targetPercentage,
  compact = false,
}: DoctorTargetCardProps) {
  const { targetSalesAmount } = getDoctorTargetBreakdown(
    allocatedAmount,
    targetPercentage
  );

  // Calculate the correct value using the formula: allocatedAmount / (targetPercentage / 100)
  const calculatedValue = allocatedAmount / (targetPercentage / 100);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyWithDecimals = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Amount You Pay</span>
          <span className="text-xs font-medium">
            ₹{allocatedAmount.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Growth Target %</span>
          <span className="text-xs font-medium">{targetPercentage}%</span>
        </div>
        <div className="border-t border-border pt-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Doctor Should Sell</span>
            <div className="text-right">
              <p className="text-sm font-bold text-amber-700 inline">
                {formatCurrency(calculatedValue)}{" "}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-amber-700" />
        </div>
        <h4 className="font-semibold text-sm">Sales Target Calculation</h4>
      </div>

      <div className="space-y-2">
        {/* Input: Amount You Pay */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted">
          <span className="text-xs text-muted-foreground">Amount You Allocate to Doctor</span>
          <span className="flex items-center gap-1 font-medium">
            <IndianRupee className="h-3 w-3" />
            {allocatedAmount.toLocaleString("en-IN")}
          </span>
        </div>

        {/* Formula Indicator */}
        <div className="flex items-center justify-center">
          <div className="flex-1 h-px bg-border"></div>
          <span className="px-2 text-xs text-muted-foreground">
            ÷ ({targetPercentage} ÷ 100)
          </span>
          <div className="flex-1 h-px bg-border"></div>
        </div>

        {/* Result: Target Sales Amount */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
          <span className="text-xs font-semibold text-amber-900">Doctor Should Sell</span>
          <span className="flex items-center gap-1 font-bold text-lg text-amber-700">
            <IndianRupee className="h-4 w-4" />
            {targetSalesAmount.toLocaleString("en-IN")}
          </span>
        </div>

      </div>
    </div>
  );
}

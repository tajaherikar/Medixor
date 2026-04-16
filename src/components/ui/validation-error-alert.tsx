import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ValidationErrorAlertProps {
  title?: string;
  discrepancies: string[];
  expected?: Record<string, number>;
  actual?: Record<string, number>;
}

export function ValidationErrorAlert({
  title = "Validation Error",
  discrepancies,
  expected,
  actual,
}: ValidationErrorAlertProps) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header with icon */}
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">{title}</h3>
              <p className="text-sm text-red-800 mt-1">
                Please check the details below before trying again.
              </p>
            </div>
          </div>

          {/* Discrepancies list */}
          {discrepancies.length > 0 && (
            <div className="space-y-2 bg-white rounded p-3 border border-red-100">
              {discrepancies.map((discrepancy, idx) => (
                <div key={idx} className="text-sm text-red-700 flex gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>{discrepancy}</span>
                </div>
              ))}
            </div>
          )}

          {/* Expected vs Actual values (if provided) */}
          {(expected || actual) && (
            <div className="grid gap-2 text-xs">
              {expected?.grandTotal !== undefined && actual?.grandTotal !== undefined && (
                <div className="flex justify-between bg-white p-2 rounded border border-red-100">
                  <span className="text-gray-600">
                    Expected Grand Total:
                  </span>
                  <span className="font-mono font-semibold text-red-700">
                    ₹{expected.grandTotal.toFixed(2)}
                  </span>
                </div>
              )}
              {expected?.grandTotal !== undefined && actual?.grandTotal !== undefined && (
                <div className="flex justify-between bg-white p-2 rounded border border-red-100">
                  <span className="text-gray-600">
                    Actual Grand Total:
                  </span>
                  <span className="font-mono font-semibold text-orange-700">
                    ₹{actual.grandTotal.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Helpful message */}
          <p className="text-xs text-red-700 bg-white p-2 rounded border border-red-100">
            💡 This check prevents invalid financial records. If the totals don't match, please review
            your calculations and discounts.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

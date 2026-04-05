"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

/**
 * Formats a number as Indian currency (INR) without decimal places
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Calculates the Doctor Should Sell value
 * 
 * Business Logic:
 * - Percentage represents the share of total sales
 * - Formula: doctorShouldSell = amountPaid / (percentage / 100)
 * 
 * Edge Cases:
 * - If percentage is 0 or missing → return 0 (avoid division by zero)
 * - If amountPaid is 0 or missing → return 0
 * - If values are negative → return 0
 * 
 * @param amountPaid - Amount paid to doctor
 * @param percentage - Target percentage (0-100)
 * @returns Calculated Doctor Should Sell value
 */
function calculateDoctorShouldSell(
  amountPaid: number | string,
  percentage: number | string
): number {
  const amount = Number(amountPaid) || 0;
  const percent = Number(percentage) || 0;

  // Validation: return 0 for invalid inputs
  if (amount <= 0 || percent <= 0) {
    return 0;
  }

  // Formula: amountPaid / (percentage / 100)
  // Simplified: amountPaid * (100 / percentage)
  const result = amount / (percent / 100);

  return result;
}

/**
 * DoctorShouldSellCalculator Component
 * 
 * A React functional component that calculates the total sales target
 * required for a doctor based on:
 * - Amount paid to the doctor
 * - Target percentage of total sales
 */
export function DoctorShouldSellCalculator() {
  const [amountPaid, setAmountPaid] = useState<number | string>("");
  const [percentage, setPercentage] = useState<number | string>("");

  // Calculate the result dynamically when inputs change
  const result = calculateDoctorShouldSell(amountPaid, percentage);

  return (
    <div className="w-full max-w-md">
      <Card className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Doctor Should Sell Calculator
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Calculate total sales target based on amount paid and percentage share
          </p>
        </div>

        {/* Input Fields */}
        <div className="space-y-4">
          {/* Amount Paid Input */}
          <div className="space-y-2">
            <Label htmlFor="amount-paid" className="text-sm font-medium">
              Amount Paid (₹)
            </Label>
            <Input
              id="amount-paid"
              type="number"
              placeholder="e.g., 30000"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              min="0"
              className="text-base"
            />
          </div>

          {/* Percentage Input */}
          <div className="space-y-2">
            <Label htmlFor="percentage" className="text-sm font-medium">
              Percentage Share (%)
            </Label>
            <Input
              id="percentage"
              type="number"
              placeholder="e.g., 30"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              min="0"
              max="100"
              className="text-base"
            />
          </div>
        </div>

        {/* Result Display */}
        {result > 0 ? (
          <div className="space-y-4">
            {/* Main Result */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700 font-semibold mb-2">DOCTOR SHOULD SELL</p>
              <p className="text-3xl font-bold text-blue-900">
                {formatCurrency(result)}
              </p>
            </div>

            {/* Formula Breakdown */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600 space-y-1">
              <p className="font-mono">
                Formula: {Number(amountPaid).toLocaleString("en-IN")} ÷ ({Number(percentage)} / 100)
              </p>
              <p className="font-mono">
                Calculation: {Number(amountPaid).toLocaleString("en-IN")} ÷ {(Number(percentage) / 100).toFixed(2)}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-500 text-sm">
              Enter amount paid and percentage to calculate
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

/**
 * pagination-controls.tsx
 * ──────────────────────────────────────────────────────────────
 * Reusable pagination UI component for tables
 */

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageSize: number;
  total: number;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onGoToPage?: (page: number) => void;
}

export function PaginationControls({
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  pageSize,
  total,
  onNextPage,
  onPreviousPage,
  onGoToPage,
}: PaginationControlsProps) {
  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, total);
  
  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-border">
      <div className="text-xs text-muted-foreground">
        Showing {total === 0 ? 0 : startItem} to {endItem} of {total} results
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousPage}
          disabled={!hasPreviousPage}
          className="h-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-xs font-medium px-3 py-1 min-w-[80px] text-center">
          Page {currentPage + 1} of {totalPages}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!hasNextPage}
          className="h-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

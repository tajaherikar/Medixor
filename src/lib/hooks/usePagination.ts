/**
 * usePagination.ts
 * ──────────────────────────────────────────────────────────────
 * Reusable pagination hook for React Query
 * Handles page state and pagination query parameters
 */

import { useState, useCallback } from "react";

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface PaginationResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Hook to manage pagination state
 * Usage:
 * const pagination = usePagination(20); // 20 items per page
 * const { data: items } = useQuery({
 *   queryKey: ["items", tenant, pagination.pageIndex],
 *   queryFn: () => fetchPaginatedItems(tenant, pagination.pageIndex, pagination.pageSize),
 * });
 */
export function usePagination(defaultPageSize: number = 20) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(defaultPageSize);

  const goToPage = useCallback((page: number) => {
    setPageIndex(Math.max(0, page));
  }, []);

  const nextPage = useCallback(() => {
    setPageIndex((prev) => prev + 1);
  }, []);

  const previousPage = useCallback(() => {
    setPageIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goToFirstPage = useCallback(() => {
    setPageIndex(0);
  }, []);

  const offset = pageIndex * pageSize;

  return {
    pageIndex,
    pageSize,
    offset,
    goToPage,
    nextPage,
    previousPage,
    goToFirstPage,
  };
}

/**
 * Helper to build pagination query string
 */
export function buildPaginationParams(pageIndex: number, pageSize: number, additionalParams?: Record<string, string | number | boolean>) {
  const params = new URLSearchParams();
  params.set("offset", String(pageIndex * pageSize));
  params.set("limit", String(pageSize));
  
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    });
  }
  
  return params;
}

/**
 * Helper to parse pagination from API response
 */
export function parsePaginationResponse<T>(response: PaginationResponse<T>) {
  return {
    items: response.data,
    total: response.total,
    page: response.page,
    pageSize: response.pageSize,
    totalPages: response.totalPages,
    hasNextPage: response.hasNextPage,
    hasPreviousPage: response.hasPreviousPage,
  };
}

import { create } from "zustand";
import { BillingDraft } from "@/lib/types";

// ─── Tenant Store ─────────────────────────────────────────────────────────────

interface TenantState {
  tenantSlug: string;
  setTenantSlug: (slug: string) => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  tenantSlug: "",
  setTenantSlug: (slug) => set({ tenantSlug: slug }),
}));

// ─── Billing Store ────────────────────────────────────────────────────────────

interface BillingState {
  draft: BillingDraft;
  setCustomer: (id: string, name: string) => void;
  setStrategy: (strategy: BillingDraft["strategy"]) => void;
  addLineItem: (item: BillingDraft["lineItems"][number]) => void;
  removeLineItem: (batchId: string) => void;
  updateLineItem: (
    batchId: string,
    updates: Partial<BillingDraft["lineItems"][number]>
  ) => void;
  clearDraft: () => void;
}

const emptyDraft: BillingDraft = {
  customerId: null,
  customerName: "",
  strategy: "fefo",
  lineItems: [],
};

export const useBillingStore = create<BillingState>((set) => ({
  draft: emptyDraft,

  setCustomer: (id, name) =>
    set((s) => ({ draft: { ...s.draft, customerId: id, customerName: name } })),

  setStrategy: (strategy) =>
    set((s) => ({ draft: { ...s.draft, strategy } })),

  addLineItem: (item) =>
    set((s) => ({
      draft: { ...s.draft, lineItems: [...s.draft.lineItems, item] },
    })),

  removeLineItem: (batchId) =>
    set((s) => ({
      draft: {
        ...s.draft,
        lineItems: s.draft.lineItems.filter((l) => l.batchId !== batchId),
      },
    })),

  updateLineItem: (batchId, updates) =>
    set((s) => ({
      draft: {
        ...s.draft,
        lineItems: s.draft.lineItems.map((l) =>
          l.batchId === batchId ? { ...l, ...updates } : l
        ),
      },
    })),

  clearDraft: () => set({ draft: emptyDraft }),
}));

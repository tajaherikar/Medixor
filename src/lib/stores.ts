import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BillingDraft, BusinessSettings, defaultBusinessSettings } from "@/lib/types";

// ─── Auth Store ───────────────────────────────────────────────────────────────

export type AuthRole = "admin" | "member";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  tenantId: string;
  role: AuthRole;
  permissions?: Array<"billing" | "inventory" | "dashboard" | "suppliers" | "customers" | "doctors" | "payments" | "reports">;
}

interface AuthState {
  user: AuthUser | null;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      login: async (email, password) => {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          credentials: "same-origin", // Ensure cookies are included
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) return false;
        const user: AuthUser = await res.json();
        set({ user });
        return true;
      },
      logout: async () => {
        // Call backend to clear server-side session cookie
        try {
          await fetch("/api/auth/logout", { 
            method: "POST",
            credentials: "same-origin",
          });
        } catch (error) {
          console.error("Logout API error:", error);
        }
        
        // Clear client-side state
        set({ user: null });
        // Clear persisted settings so the next login starts with a clean slate
        useSettingsStore.getState().resetSettings();
        // Clear React Query cache to prevent data leakage between users
        const { queryClient } = await import("@/components/providers");
        queryClient.clear();
      },
    }),
    {
      name: "medixor-auth",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

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

// ─── Settings Store ───────────────────────────────────────────────────────────

interface SettingsState {
  settings: BusinessSettings;
  updateSettings: (patch: Partial<BusinessSettings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: { ...defaultBusinessSettings },
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetSettings: () => set({ settings: { ...defaultBusinessSettings } }),
    }),
    { name: "medixor-settings" }
  )
);


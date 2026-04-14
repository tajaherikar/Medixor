"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSettingsStore } from "@/lib/stores";
import { BusinessSettings } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { UnsavedChangesModal } from "@/components/ui/unsaved-changes-modal";
import {
  Building2,
  Palette,
  FileText,
  Package2,
  Upload,
  X,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Colour presets ──────────────────────────────────────────────────────────

const COLOUR_PRESETS: { label: string; hue: number }[] = [
  { label: "Teal",    hue: 196 },
  { label: "Cyan",    hue: 210 },
  { label: "Blue",    hue: 240 },
  { label: "Indigo",  hue: 258 },
  { label: "Violet",  hue: 275 },
  { label: "Purple",  hue: 290 },
  { label: "Rose",    hue: 15  },
  { label: "Orange",  hue: 50  },
  { label: "Amber",   hue: 65  },
  { label: "Green",   hue: 152 },
];

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-xl border border-border shadow-none">
      <CardHeader className="px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
            <Icon className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-6 py-5 space-y-4">{children}</CardContent>
    </Card>
  );
}

// ─── Field row ───────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-2 sm:gap-4 items-start">
      <div className="pt-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

const inputCls =
  "w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors";

// ─── Main component ──────────────────────────────────────────────────────────

export function Settings({ tenant }: { tenant: string }) {
  const { settings, updateSettings } = useSettingsStore();
  const [draft, setDraft] = useState<BusinessSettings>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load from server on mount — server is source of truth across devices
  useEffect(() => {
    fetch(`/api/${tenant}/settings`)
      .then((r) => r.json())
      .then((data: BusinessSettings) => {
        updateSettings(data);
        setDraft({ ...data });
      })
      .catch(() => { /* fall back to localStorage values already in store */ });
  }, [tenant]); // eslint-disable-line react-hooks/exhaustive-deps

  function patch<K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error("Logo must be smaller than 500 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patch("logoBase64", reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/${tenant}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Save failed");
      updateSettings(draft);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings — please try again");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setDraft({ ...settings });
    toast("Changes discarded");
  }

  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);

  // Warn on browser tab close / refresh
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Intercept in-app link clicks in capture phase — fires before Next.js router
  useEffect(() => {
    if (!isDirty) return;
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;  // external link
        if (url.pathname === window.location.pathname) return; // same page
      } catch {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setPendingNavUrl(href);
      setShowUnsavedModal(true);
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isDirty]);

  function navigateToPending() {
    if (pendingNavUrl) router.push(pendingNavUrl);
    setPendingNavUrl(null);
  }

  return (
    <div className="flex flex-col h-full">
    <div className="flex-1 min-h-0 overflow-y-auto">
    <div className="space-y-6 max-w-3xl pb-6">

      {/* ── Business Identity ─────────────────────────────────────────── */}
      <Section
        icon={Building2}
        title="Business Identity"
        subtitle="Your business details appear on printed invoices and reports"
      >
        <Field label="Business name" hint="Shown in the sidebar and on printed invoices">
          <input
            className={inputCls}
            placeholder="e.g. Sharma Medical Store"
            value={draft.businessName}
            onChange={(e) => patch("businessName", e.target.value)}
          />
        </Field>

        <Field label="Logo" hint="PNG or JPG · max 500 KB · shown on printed invoices">
          <div className="flex items-start gap-4">
            {draft.logoBase64 ? (
              <div className="relative w-24 h-16 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={draft.logoBase64}
                  alt="Business logo"
                  className="max-h-full max-w-full object-contain"
                />
                <button
                  onClick={() => patch("logoBase64", null)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  title="Remove logo"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="w-24 h-16 rounded-lg border-2 border-dashed border-border bg-muted/40 flex flex-col items-center justify-center shrink-0 text-muted-foreground">
                <Upload className="h-4 w-4 mb-1" />
                <span className="text-[10px]">No logo</span>
              </div>
            )}
            <div>
              <button
                onClick={() => logoInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-foreground"
              >
                <Upload className="h-3.5 w-3.5" />
                {draft.logoBase64 ? "Change logo" : "Upload logo"}
              </button>
              <p className="text-xs text-muted-foreground mt-1.5">
                Recommended: transparent PNG, 240×80 px
              </p>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
          </div>
        </Field>

        <Field label="GSTIN" hint="GST Identification Number">
          <input
            className={inputCls}
            placeholder="e.g. 27AABCU9603R1ZX"
            value={draft.gstin}
            onChange={(e) => patch("gstin", e.target.value.toUpperCase())}
            maxLength={15}
          />
        </Field>

        <Field label="Address" hint="Full address printed on invoices">
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            placeholder={"e.g. 12, MG Road\nPune - 411001\nMaharashtra"}
            value={draft.address}
            onChange={(e) => patch("address", e.target.value)}
          />
        </Field>

        <Field label="Phone number">
          <input
            className={inputCls}
            placeholder="e.g. +91 98765 43210"
            value={draft.phone}
            onChange={(e) => patch("phone", e.target.value)}
          />
        </Field>
      </Section>

      {/* ── Appearance ────────────────────────────────────────────────── */}
      <Section
        icon={Palette}
        title="Appearance"
        subtitle="Choose the accent colour used throughout the app"
      >
        <Field label="Colour theme">
          <div className="flex flex-wrap gap-3">
            {COLOUR_PRESETS.map(({ label, hue }) => {
              const isSelected = draft.accentHue === hue;
              return (
                <button
                  key={hue}
                  title={label}
                  onClick={() => patch("accentHue", hue)}
                  className={`relative flex flex-col items-center gap-1.5 group`}
                >
                  <span
                    className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all ${
                      isSelected
                        ? "ring-2 ring-offset-2 ring-offset-background"
                        : "hover:scale-110"
                    }`}
                    style={{
                      background: `oklch(0.52 0.15 ${hue})`,
                      ...(isSelected ? { ["--tw-ring-color" as string]: `oklch(0.52 0.15 ${hue})` } : {}),
                    }}
                  >
                    {isSelected && (
                      <CheckCircle2
                        className="h-4 w-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                      />
                    )}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium leading-none">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>
      </Section>

      {/* ── Invoice Settings ──────────────────────────────────────────── */}
      <Section
        icon={FileText}
        title="Invoice Settings"
        subtitle="Customise how invoices are numbered and what appears on printed copies"
      >
        <Field label="Invoice prefix" hint="Prepended to every new invoice number">
          <div className="flex items-center gap-3">
            <input
              className={`${inputCls} max-w-[160px]`}
              placeholder="INV-"
              value={draft.invoicePrefix}
              onChange={(e) => patch("invoicePrefix", e.target.value)}
            />
            <span className="text-xs text-muted-foreground">
              Preview:{" "}
              <span className="font-mono font-semibold text-foreground">
                {(draft.invoicePrefix || "INV-")}2026-0042
              </span>
            </span>
          </div>
        </Field>

        <Field label="Invoice footer" hint="Printed at the bottom of every invoice">
          <textarea
            className={`${inputCls} resize-none`}
            rows={2}
            placeholder="Thank you for your business."
            value={draft.invoiceFooter}
            onChange={(e) => patch("invoiceFooter", e.target.value)}
          />
        </Field>

        <Field
          label="Reference on PDF"
          hint='Print the “Referred by” Doctor / Lab / Consultant on generated invoice PDFs'
        >
          <button
            type="button"
            role="switch"
            aria-checked={draft.showReferenceField}
            onClick={() => patch("showReferenceField", !draft.showReferenceField)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
              draft.showReferenceField ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform ${
                draft.showReferenceField ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </Field>
        <Field
          label="Quick Billing Mode"
          hint="Allow fast invoicing with minimal customer details. Users can toggle between Quick and Full bill."
        >
          <button
            type="button"
            role="switch"
            aria-checked={draft.enableQuickBilling}
            onClick={() => patch("enableQuickBilling", !draft.enableQuickBilling)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
              draft.enableQuickBilling ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform ${
                draft.enableQuickBilling ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </Field>      </Section>

      {/* ── Inventory ─────────────────────────────────────────────── */}
      <Section
        icon={Package2}
        title="Inventory"
        subtitle="Configure stock thresholds and alerts"
      >
        <Field
          label="Low stock threshold"
          hint="Batches with fewer units than this value are highlighted as low stock on the dashboard and inventory page"
        >
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={9999}
              className={`${inputCls} max-w-[120px]`}
              value={draft.lowStockThreshold}
              onChange={(e) =>
                patch("lowStockThreshold", Math.max(0, parseInt(e.target.value) || 0))
              }
            />
            <span className="text-xs text-muted-foreground">units</span>
          </div>
        </Field>
      </Section>
    </div>
    </div>

      {/* ── Save bar — always-visible footer outside scroll area ─────── */}
      <div className="shrink-0 -mx-6 md:-mx-8 -mb-6 md:-mb-8 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="px-6 md:px-8 py-3.5 flex items-center justify-between gap-4">
          <p className={`text-sm text-muted-foreground transition-all duration-300 ${
            isDirty ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"
          }`}>
            You have unsaved changes.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleDiscard}
              disabled={!isDirty}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </div>
      </div>

      <UnsavedChangesModal
        open={showUnsavedModal}
        onSave={async () => {
          await handleSave();
          setShowUnsavedModal(false);
          navigateToPending();
        }}
        onDiscard={() => {
          setDraft({ ...settings });
          setShowUnsavedModal(false);
          navigateToPending();
        }}
        title="Unsaved Settings"
        description="You have unsaved changes to your settings. Save before leaving?"
      />
    </div>
  );
}

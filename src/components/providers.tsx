"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSettingsStore } from "@/lib/stores";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 min
      retry: 1,
    },
  },
});

function applyAccentHue(hue: number) {
  const root = document.documentElement;
  root.style.setProperty("--primary",              `oklch(0.52 0.15 ${hue})`);
  root.style.setProperty("--secondary",            `oklch(0.94 0.04 ${hue})`);
  root.style.setProperty("--secondary-foreground", `oklch(0.32 0.10 ${hue})`);
  root.style.setProperty("--accent",               `oklch(0.90 0.06 ${hue})`);
  root.style.setProperty("--accent-foreground",    `oklch(0.32 0.10 ${hue})`);
  root.style.setProperty("--ring",                 `oklch(0.52 0.15 ${hue})`);
  root.style.setProperty("--sidebar-primary",      `oklch(0.52 0.15 ${hue})`);
  root.style.setProperty("--sidebar-ring",         `oklch(0.52 0.15 ${hue})`);
}

function ThemeApplicator() {
  const hue = useSettingsStore((s) => s.settings.accentHue);
  useEffect(() => {
    applyAccentHue(hue);
  }, [hue]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeApplicator />
      {children}
    </QueryClientProvider>
  );
}

export { applyAccentHue };


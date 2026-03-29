"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 min
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [mswReady, setMswReady] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      import("@/lib/mock/browser").then(({ worker }) => {
        worker.start({ onUnhandledRequest: "bypass" }).then(() => {
          setMswReady(true);
        });
      });
    } else {
      setMswReady(true);
    }
  }, []);

  if (!mswReady) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Initialising...
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

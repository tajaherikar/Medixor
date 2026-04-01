import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Hook to detect and warn about unsaved changes when leaving a form.
 * Prevents accidental data loss by:
 * 1. Showing browser beforeunload warning if user navigates away
 * 2. Optionally showing a confirmation modal when routing within the app
 */
export function useUnsavedChanges(
  isDirty: boolean,
  onConfirm?: () => void
) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [nextRoute, setNextRoute] = useState<string | null>(null);

  // Browser beforeunload warning
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Intercept Link component navigation (if needed)
  // This would require wrapping with a router context, can be enhanced later
  const handleConfirmLeave = (shouldLeave: boolean) => {
    setShowConfirm(false);
    if (shouldLeave) {
      if (onConfirm) onConfirm();
      if (nextRoute) router.push(nextRoute);
    }
  };

  return {
    showConfirm,
    setShowConfirm,
    nextRoute,
    setNextRoute,
    handleConfirmLeave,
  };
}

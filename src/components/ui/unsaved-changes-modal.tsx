import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UnsavedChangesModalProps {
  open: boolean;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  title?: string;
  description?: string;
}

export function UnsavedChangesModal({
  open,
  onSave,
  onDiscard,
  title = "Unsaved Changes",
  description = "You have unsaved changes. Do you want to save them before leaving?",
}: UnsavedChangesModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDiscard()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onDiscard}>
            Discard Changes
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
            {isSaving ? "Saving..." : "Save & Leave"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

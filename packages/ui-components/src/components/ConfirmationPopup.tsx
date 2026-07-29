import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

export interface ConfirmationPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  isConfirming?: boolean;
  variant?: "primary" | "destructive" | "brand";
}

export function ConfirmationPopup({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isConfirming = false,
  variant = "primary",
}: ConfirmationPopupProps) {
  const handleCancel = () => {
    if (onCancel) onCancel();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
    // Do not automatically close if isConfirming is expected to keep it open while loading,
    // The parent can close it upon success.
  };

  return (
    <Dialog open={open} onOpenChange={isConfirming ? undefined : onOpenChange}>
      <DialogContent showCloseButton={!isConfirming}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isConfirming}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            disabled={isConfirming}
          >
            {isConfirming && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmationPopup;

import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@flaner/shared/utils";

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
  variant?: "primary" | "destructive" | "brand" | "warning";
  confirmClassName?: string;
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
  confirmClassName,
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

  const isWarning = variant === "warning";
  const buttonVariant = isWarning ? "primary" : variant;

  return (
    <Dialog open={open} onOpenChange={isConfirming ? undefined : onOpenChange}>
      <DialogContent showCloseButton={!isConfirming} onCloseAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription asChild={typeof description !== "string"}>
              {typeof description === "string" ? description : <div>{description}</div>}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCancel();
            }}
            disabled={isConfirming}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={buttonVariant}
            className={cn(
              isWarning && "bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-md shadow-amber-600/20 border-transparent",
              confirmClassName,
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleConfirm();
            }}
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

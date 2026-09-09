import React, { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Button,
  ConfirmationPopup,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@flaner/ui-components";
import type { FilamentTemplate } from "../../../api/templates";
import { fetchAssociatedSpools } from "../../../api/templates";
import { useDeleteTemplateMutation, useToolsTranslations } from "../../../hooks";
import { useAuth } from "@flaner/shared/context";

type DeleteTemplateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  template: FilamentTemplate | null;
};

export const DeleteTemplateModal: React.FC<DeleteTemplateModalProps> = ({
  isOpen,
  onClose,
  template,
}) => {
  const { t } = useToolsTranslations();
  const { user } = useAuth();
  const [hasSpools, setHasSpools] = useState(false);
  const [isLoadingSpools, setIsLoadingSpools] = useState(false);

  const deleteMutation = useDeleteTemplateMutation({
    onSuccess: () => {
      onClose();
    },
  });

  useEffect(() => {
    const checkSpools = async () => {
      if (isOpen && template && user) {
        setIsLoadingSpools(true);
        try {
          const spools = await fetchAssociatedSpools(user.uid, template.id);
          setHasSpools(spools.length > 0);
        } catch (error) {
          console.error("Error fetching associated spools:", error);
        } finally {
          setIsLoadingSpools(false);
        }
      }
    };
    checkSpools();
  }, [isOpen, template, user]);

  if (!template) return null;

  const isPending = deleteMutation.isPending || isLoadingSpools;

  if (!hasSpools) {
    return (
      <ConfirmationPopup
        open={isOpen}
        onOpenChange={(open) => !open && onClose()}
        onConfirm={() => deleteMutation.mutate({ templateId: template.id, deleteSpools: false })}
        title={t("spooler.templates.deletePromptTitle")}
        description={t("spooler.templates.deletePromptBody")}
        confirmLabel={t("spooler.templates.deleteTemplate")}
        cancelLabel={t("spooler.common.cancel")}
        variant="destructive"
        isConfirming={isPending}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            {t("spooler.templates.deleteCascadeTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="py-3 text-sm text-muted-foreground space-y-3">
          <p>{t("spooler.templates.deleteCascadeBody")}</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t("spooler.common.cancel")}
          </Button>
          <Button
            variant="secondary"
            disabled={isPending}
            onClick={() =>
              deleteMutation.mutate({
                templateId: template.id,
                deleteSpools: false,
              })
            }
          >
            {t("spooler.templates.keepSpools")}
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              deleteMutation.mutate({
                templateId: template.id,
                deleteSpools: true,
              })
            }
          >
            {deleteMutation.isPending ? (
              <Loader2 className="size-4 animate-spin mr-1" />
            ) : null}
            {t("spooler.templates.deleteWithSpools")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteTemplateModal;

import React from "react";
import { ConfirmationPopup } from "@flaner/ui-components";
import type { FilamentSpool } from "../../../api/spools";
import { useToolsTranslations } from "../../../hooks/useToolsTranslations";

type CloneSpoolPromptModalProps = {
  isOpen: boolean;
  onClose: () => void;
  spool: FilamentSpool | null;
  onConfirm: (spool: FilamentSpool) => void;
};

export const CloneSpoolPromptModal: React.FC<CloneSpoolPromptModalProps> = ({
  isOpen,
  onClose,
  spool,
  onConfirm,
}) => {
  const { t } = useToolsTranslations();

  if (!spool) return null;

  return (
    <ConfirmationPopup
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      onConfirm={() => {
        onConfirm(spool);
        onClose();
      }}
      title={t("spooler.spools.emptyTriggerTitle")}
      description={t("spooler.spools.emptyTriggerBody")}
      confirmLabel={t("spooler.spools.cloneConfirm")}
      cancelLabel={t("spooler.spools.cloneDismiss")}
      variant="primary"
    />
  );
};

export default CloneSpoolPromptModal;

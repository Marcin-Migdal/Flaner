import React from "react";
import { ConfirmationPopup } from "@flaner/ui-components";
import { useToolsTranslations } from "../../../../hooks/useToolsTranslations";

type CloneSpoolPromptModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export const CloneSpoolPromptModal: React.FC<CloneSpoolPromptModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { t } = useToolsTranslations();

  return (
    <ConfirmationPopup
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      onConfirm={() => {
        onConfirm();
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

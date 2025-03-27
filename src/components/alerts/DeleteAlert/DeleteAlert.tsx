import { Alert, AlertOpenState } from "@marcin-migdal/m-component-library";

import { useTranslation } from "react-i18next";

type DeleteAlertProps = {
  alertOpen: AlertOpenState;
  onDelete: () => Promise<void>;
  handleClose: () => void;
  entity: string;
};

export const DeleteAlert = ({ entity, alertOpen, onDelete, handleClose }: DeleteAlertProps) => {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onDelete().then(() => {
      handleClose();
    });
  };

  return (
    <Alert
      className="w-350-px"
      alertOpen={alertOpen}
      handleClose={handleClose}
      header={t("Delete")}
      confirmBtnText={t("Delete")}
      declineBtnText={t("Close")}
      onConfirm={handleConfirm}
      onDecline={handleClose}
    >
      <p>{t(`Are you sure, you want to delete ${t(entity.toLocaleLowerCase())}?`)}</p>
    </Alert>
  );
};

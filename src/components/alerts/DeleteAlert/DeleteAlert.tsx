import { Alert, AlertOpenState } from "@marcin-migdal/m-component-library";
import { BaseQueryFn, MutationActionCreatorResult, MutationDefinition } from "@reduxjs/toolkit/query";
import { useTranslation } from "react-i18next";

import { useAppDispatch } from "@hooks";
import { addToast } from "@slices";

export type OnDeleteMutation =
  | MutationActionCreatorResult<MutationDefinition<unknown, BaseQueryFn, string, unknown, string>>
  | undefined;

type DeleteAlertProps = {
  alertOpen: AlertOpenState;
  onDelete: () => OnDeleteMutation;
  handleClose: () => void;
};

export const DeleteAlert = ({ alertOpen, onDelete, handleClose }: DeleteAlertProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const handleConfirm = () => {
    onDelete()
      ?.unwrap()
      .then(() => {
        handleClose();
        dispatch(addToast({ message: "common.actions.deleted" }));
      });
  };

  return (
    <Alert
      className="w-350-px"
      alertOpen={alertOpen}
      handleClose={handleClose}
      header={t("common.actions.delete")}
      confirmBtnText={t("common.actions.delete")}
      declineBtnText={t("common.actions.close")}
      onConfirm={handleConfirm}
      onDecline={handleClose}
    >
      <p>{t("common.actions.deleteConfirmation")}</p>
    </Alert>
  );
};

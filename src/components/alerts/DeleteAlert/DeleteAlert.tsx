import { useAppDispatch } from "@hooks/redux-hooks";
import { Alert, AlertOpenState } from "@marcin-migdal/m-component-library";
import { BaseQueryFn, MutationActionCreatorResult, MutationDefinition } from "@reduxjs/toolkit/query";
import { addToast } from "@slices/toast-slice";

import { useTranslation } from "react-i18next";

export type OnDeleteMutation =
  | MutationActionCreatorResult<MutationDefinition<unknown, BaseQueryFn, string, unknown, string>>
  | undefined;

type DeleteAlertProps = {
  alertOpen: AlertOpenState;
  onDelete: () => OnDeleteMutation;
  handleClose: () => void;
  entity: string;
};

export const DeleteAlert = ({ entity, alertOpen, onDelete, handleClose }: DeleteAlertProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const handleConfirm = () => {
    onDelete()
      ?.unwrap()
      .then(() => {
        handleClose();
        dispatch(
          addToast({
            message: `${entity} has been deleted`,
            disableTransformContent: true,
          })
        );
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

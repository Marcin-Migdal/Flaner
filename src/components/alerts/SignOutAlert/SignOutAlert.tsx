import { Alert, AlertOpenState } from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";

import { signOut } from "../../../app/slices/authorization-slice";
import { useAppDispatch } from "../../../hooks";

type SignOutAlertProps = {
  onAction?: () => void;
  alertOpen: AlertOpenState;
  handleClose: () => void;
};

export const SignOutAlert = ({ onAction, alertOpen, handleClose }: SignOutAlertProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const handleSignOut = () => {
    dispatch(signOut());
    onAction && onAction();
  };

  return (
    <Alert
      className="w-350-px"
      alertOpen={alertOpen}
      handleClose={handleClose}
      header={t("Sign out")}
      confirmBtnText={t("Sign out")}
      declineBtnText={t("Close")}
      onConfirm={handleSignOut}
      onDecline={onAction}
    >
      <p>{t("Are you sure, you want to sing out?")}</p>
    </Alert>
  );
};

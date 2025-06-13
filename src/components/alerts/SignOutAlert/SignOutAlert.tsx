import { Alert, AlertOpenState } from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";

import { useAppDispatch } from "@hooks";
import { signOut } from "@services/Authorization";

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
      header={t("auth.signOut")}
      confirmBtnText={t("auth.signOut")}
      declineBtnText={t("common.close")}
      onConfirm={handleSignOut}
      onDecline={onAction}
    >
      <p>{t("auth.confirmSignOut")}</p>
    </Alert>
  );
};

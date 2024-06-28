import { Alert, AlertHandler } from "@Marcin-Migdal/morti-component-library";
import { RefObject } from "react";

import { useAppDispatch } from "@hooks/redux-hooks";
import { signOut } from "@slices/authorization-slice";
import { useTranslation } from "react-i18next";

type SignOutAlertProps = {
    alertRef: RefObject<AlertHandler>;
    onAction?: () => void;
};

export const SignOutAlert = ({ alertRef, onAction }: SignOutAlertProps) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const handleSignOut = () => {
        dispatch(signOut({ t: t }));
        onAction && onAction();
    };

    const handleClose = () => {
        alertRef.current?.closeAlert();
        onAction && onAction();
    };

    return (
        <Alert
            ref={alertRef}
            header={{ header: t("Sign out") }}
            footer={{
                confirmBtnText: t("Sign out"),
                declineBtnText: t("Close"),
                onConfirmBtnClick: handleSignOut,
                onDeclineBtnClick: handleClose,
            }}
        >
            <p>{t("Are you sure, you want to sing out?")}</p>
        </Alert>
    );
};

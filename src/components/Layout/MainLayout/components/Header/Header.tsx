import { Alert, AlertHandler } from "@Marcin-Migdal/morti-component-library";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { NavigateFunction, useNavigate } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "@hooks/redux-hooks";
import { useBreakpoint } from "@hooks/useBreakpoint";
import { selectAuthorization, signOut } from "@slices/authorization-slice";
import { NavigationNode, navigationTree } from "@utils/constants";
import { PATH_CONSTRANTS } from "@utils/enums";
import { DesktopNavbar } from "./components/DesktopNavbar/DesktopNavbar";
import { MobileMenu } from "./components/MobileMenu/MobileMenu";
import { HeaderItem } from "./interfaces";

import "./styles.scss";

const mapNavigationTree = (t: (string: string) => string, navigate: NavigateFunction, navigationTree: NavigationNode[]): HeaderItem[] => {
    return navigationTree.map(({ path, subItems, ...other }) => {
        return { ...other, onClick: () => navigate(path), subItems: subItems ? mapNavigationTree(t, navigate, subItems) : [] };
    });
};

//? Flaner
// TODO! email validation on email sign-up

// TODO! Finish mobile menu

// TODO! add translations for desktop navbar and mobile menu

//? LIB 2
// TODO! Temporary solution, later add feature of, passing data to alert as openAlert argument, making it available in onConfirmBtnClick, onDeclineBtnClick
// TODO! move navbar component used in header to lib

export const Header = () => {
    const navigate = useNavigate();
    const { t } = useTranslation(["header"]);

    const dispatch = useAppDispatch();
    const { authUser } = useAppSelector(selectAuthorization);

    const alertRef = useRef<AlertHandler>(null);
    const isMobile = useBreakpoint(`(max-width: 768px)`);

    const navigationItems: HeaderItem[] = mapNavigationTree(t, navigate, navigationTree);

    const userProfileItem: HeaderItem = {
        iconUrl: authUser?.avatarUrl,
        subItems: [
            { text: "Settings", onClick: () => navigate(PATH_CONSTRANTS.SETTINGS), icon: ["fas", "gear"] },
            { text: "Sign out", onClick: () => alertRef.current?.openAlert(), icon: ["fas", "sign-out"] },
        ],
    };

    const handleSignOut = () => {
        dispatch(signOut({ t: t }));
    };

    return (
        <>
            <div className="header">
                <h1 onClick={() => navigate(PATH_CONSTRANTS.HOME)}>{process.env.APP_NAME}</h1>
                {!isMobile ? (
                    <DesktopNavbar navigationItems={navigationItems} userProfileItem={userProfileItem} />
                ) : (
                    <MobileMenu menuItems={navigationItems} />
                )}
            </div>
            <Alert
                ref={alertRef}
                header={{ header: t("Sign out") }}
                footer={{
                    onConfirmBtnClick: handleSignOut,
                    onDeclineBtnClick: () => alertRef.current?.closeAlert(),
                }}
            >
                <p>{t("Are you sure, you want to sing out?")}</p>
            </Alert>
        </>
    );
};

import { useTranslation } from "react-i18next";
import { NavigateFunction, useNavigate } from "react-router-dom";

import { useAppDispatch } from "@hooks/redux-hooks";
import { useBreakpoint } from "@hooks/useBreakpoint";
import { signOut } from "@slices/authorization-slice";
import { NavigationNode, navigationTree } from "@utils/constants";
import { PATH_CONSTRANTS } from "@utils/enums";
import { DesktopHeaderMenu } from "./components/DesktopHeaderMenu/DesktopHeaderMenu";
import { MobileHeaderMenu } from "./components/MobileHeaderMenu/MobileHeaderMenu";
import { HeaderItem } from "./interfaces";

import "./styles.scss";

const mapNavigationTree = (t: (string: string) => string, navigate: NavigateFunction, navigationTree: NavigationNode[]): HeaderItem[] => {
    return navigationTree.map(({ path, subItems, ...other }) => {
        return { ...other, onClick: () => navigate(path), subItems: subItems ? mapNavigationTree(t, navigate, subItems) : [] };
    });
};

export const Header = () => {
    const { t } = useTranslation(["header"]);
    const navigate = useNavigate();

    const dispatch = useAppDispatch();

    const isMobile = useBreakpoint(`(max-width: 768px)`);

    const handleSignOut = () => dispatch(signOut({ t: t }));

    const menuItems: HeaderItem[] = [
        ...mapNavigationTree(t, navigate, navigationTree),
        { text: t("Sign Out"), onClick: handleSignOut, icon: ["fas", "sign-out"] },
    ];

    return (
        <div className="header">
            <h1 onClick={() => navigate(PATH_CONSTRANTS.HOME)}>{process.env.APP_NAME}</h1>
            {!isMobile ? <DesktopHeaderMenu menuItems={menuItems} /> : <MobileHeaderMenu menuItems={menuItems} />}
        </div>
    );
};

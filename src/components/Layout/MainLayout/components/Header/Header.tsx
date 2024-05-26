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

/*
    * display notification in navbar. 
        - new bell icon in navbar [DONE]
        - delete weird effect on hover (icon container becomes wider)

        - add field to notification document, content: string, eq. "{user}, accepted your friend request"
        - add field to notification document, read: boolean, default false

        - fetch notifications
        - when hovered, dropdown with notification should appear
        - create option to pass custom desktop navbar item
            - for now only notification type "friend-request-accepted" should be handled, but logic should be make with expansion in mind (something like switch or something similar)
        
        - if user opens notification dropdown, all notification(that have field "read" === false) should be edited to have field "read" set to true
        - bell should have number on it, indicating how many unread notification user have

*/

//? LIB
// TODO! on sign out, confirmation popup should be shown (prob. new component in lib.)
// TODO! add new color theme

// TODO! check if all functions in usersApi correctly catch errors
// TODO! implement error middleware (displaying toast on error)

export const Header = () => {
    const { t } = useTranslation(["header"]);
    const navigate = useNavigate();

    const { authUser } = useAppSelector(selectAuthorization);
    const dispatch = useAppDispatch();

    const isMobile = useBreakpoint(`(max-width: 768px)`);

    const handleSignOut = () => dispatch(signOut({ t: t }));

    const menuItems: HeaderItem[] = [
        ...mapNavigationTree(t, navigate, navigationTree),
        {
            icon: ["fas", "bell"],
            subItems: [
                { text: "Sign out", onClick: handleSignOut, icon: ["fas", "sign-out"] },
                { text: "Settings", onClick: () => navigate(PATH_CONSTRANTS.SETTINGS), icon: ["fas", "gear"] },
            ],
        },
        {
            iconUrl: authUser?.avatarUrl,
            subItems: [
                { text: "Sign out", onClick: handleSignOut, icon: ["fas", "sign-out"] },
                { text: "Settings", onClick: () => navigate(PATH_CONSTRANTS.SETTINGS), icon: ["fas", "gear"] },
            ],
        },
    ];

    return (
        <div className="header">
            <h1 onClick={() => navigate(PATH_CONSTRANTS.HOME)}>{process.env.APP_NAME}</h1>
            {!isMobile ? <DesktopNavbar menuItems={menuItems} /> : <MobileMenu menuItems={menuItems} />}
        </div>
    );
};

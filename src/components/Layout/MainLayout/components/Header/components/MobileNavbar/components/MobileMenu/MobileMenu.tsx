import { useAlert } from "@marcin-migdal/m-component-library";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Avatar } from "@components/Avatar";
import { SignOutAlert } from "@components/alerts";
import { AuthUserConfigType } from "@slices/authorization-slice";
import { navigationTree } from "@utils/constants";
import { PATH_CONSTRANTS } from "@utils/enums";
import { mapNavigationTree } from "@utils/helpers/mapNavigationTree";
import { HeaderItem, MobileHeaderMenuOpenType } from "../../../../interfaces";
import { MobileMenuItem, OpenMenuConfig } from "./MobileMenuItem";

import "./styles.scss";

type MobileMenuProps = {
  authUser: AuthUserConfigType | null;
  menuOpen: MobileHeaderMenuOpenType;
  toggleMenuDropdown: () => void;
};

export const MobileMenu = ({ authUser, menuOpen, toggleMenuDropdown }: MobileMenuProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [handleOpenAlert, alertProps] = useAlert();

  const [openMenuItem, setOpenMenuItem] = useState<OpenMenuConfig>({ openStatus: "closed", item: undefined });

  const navigationItems: HeaderItem[] = mapNavigationTree(t, navigate, navigationTree);

  const settingsItem: HeaderItem = {
    text: "Settings",
    onClick: () => navigate(PATH_CONSTRANTS.SETTINGS),
    icon: ["fas", "gear"],
  };

  const signOutItem: HeaderItem = {
    text: "Sign out",
    onClick: () => handleOpenAlert(),
    icon: ["fas", "sign-out"],
  };

  const handleCloseMenuItem = () => {
    setOpenMenuItem({ openStatus: "closing", item: openMenuItem.item });

    setTimeout(() => {
      setOpenMenuItem({ openStatus: "closed", item: undefined });
    }, 150);
  };

  const handleOpenMenuItem = (text: string) => {
    setOpenMenuItem({ openStatus: "mounted", item: text });

    setTimeout(() => {
      setOpenMenuItem({ openStatus: "opened", item: text });
    }, 150);
  };

  useEffect(() => {
    if (menuOpen === "closing") {
      handleCloseMenuItem();
    }
  }, [menuOpen]);

  const toggleMenuItem = (text: string, event: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
    event.stopPropagation();

    if (["mounted", "opened"].includes(openMenuItem.openStatus)) {
      handleCloseMenuItem();

      if (openMenuItem.item !== text) {
        setTimeout(() => {
          handleOpenMenuItem(text);
        }, 150);
      }

      return;
    }

    handleOpenMenuItem(text);
  };

  if (menuOpen === "closed") {
    return null;
  }

  return createPortal(
    <div className={`mobile-menu ${menuOpen}`}>
      <ul className="mobile-menu-list">
        <li className="user-item">
          <Avatar avatarUrl={authUser?.avatarUrl} />
          <h2>{authUser?.username}</h2>
        </li>

        {navigationItems.map((navigationItem, index) => (
          <MobileMenuItem
            key={index}
            navigationItem={navigationItem}
            closeMenuDropdown={toggleMenuDropdown}
            itemPath={navigationItem.text as string}
            toggleMenuItem={toggleMenuItem}
            openMenuItem={openMenuItem}
            depth={1}
          />
        ))}
        <MobileMenuItem depth={1} navigationItem={settingsItem} closeMenuDropdown={toggleMenuDropdown} />
        <MobileMenuItem depth={1} navigationItem={signOutItem} closeMenuDropdown={() => {}} />
      </ul>
      <SignOutAlert {...alertProps} onAction={toggleMenuDropdown} />
    </div>,
    document.querySelector(".common-wrapper-container") as Element
  );
};

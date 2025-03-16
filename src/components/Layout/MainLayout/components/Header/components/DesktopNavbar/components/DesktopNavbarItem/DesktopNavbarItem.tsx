import { MouseEvent, ReactNode, createContext, useRef, useState } from "react";

import { HeaderItem, OpenDirectionType, SubMenuPosition } from "../../../../interfaces";

import "./styles.scss";

type NavbarItemContext = {
  item: HeaderItem;
  subMenuPosition: SubMenuPosition | undefined;
  depth: number;
};

export const NavbarItemContext = createContext<NavbarItemContext>({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: {} as any,
  subMenuPosition: undefined,
  depth: 0,
});

interface INavbarItemProps {
  navbarItem: HeaderItem;
  depth?: number;
  openDirection?: OpenDirectionType;
  children: ReactNode | ReactNode[];
  alwaysOpenSubMenu?: boolean;
  className?: string;
  onOpen?: (navbarItem: HeaderItem) => void;
  onClose?: (navbarItem: HeaderItem) => void;
}

export const DesktopNavbarItem = ({
  children,
  navbarItem,
  depth = 0,
  openDirection = "right",
  alwaysOpenSubMenu = false,
  className = "",
  onOpen,
  onClose,
}: INavbarItemProps) => {
  const itemRef = useRef<HTMLLIElement>(null);

  const [subMenuPosition, setSubMenuPosition] = useState<SubMenuPosition | undefined>(undefined);
  const { onClick, disabled = false, subItems } = navbarItem;

  const handleClick = (event) => {
    event.stopPropagation();

    if (disabled || !onClick) {
      return;
    }

    onClick(event);
  };

  const handleMouseEnter = (event: MouseEvent<HTMLLIElement>) => {
    event.stopPropagation();

    if (disabled || (!alwaysOpenSubMenu && (!subItems || !(subItems.filter((item) => !item.disabled).length > 0)))) {
      return;
    }

    const { bottom, width, left, right } = event.currentTarget.getBoundingClientRect();

    let validatedOpenDirection: OpenDirectionType = openDirection;

    if (openDirection === "right") {
      validatedOpenDirection = right + width <= window.innerWidth ? "right" : "left";
    } else if (openDirection === "left") {
      validatedOpenDirection = left - width >= 0 ? "left" : "right";
    }

    if (depth === 0) {
      setSubMenuPosition({
        top: bottom,
        left: validatedOpenDirection === "right" ? 0 : "unset",
        right: validatedOpenDirection === "right" ? "unset" : 0,
        minWidth: width,
        borderTop: "var(--border-sm) solid var(--grey-color-000)",
        zIndex: depth + 1,
      });
    } else {
      setSubMenuPosition({
        top: 0,
        left: validatedOpenDirection === "right" ? width : `-${width}px`,
        minWidth: width,
        zIndex: depth + 1,
        openDirection: validatedOpenDirection,
      });
    }

    onOpen && onOpen(navbarItem);
  };

  const handleMouseLeave = (event: MouseEvent<HTMLLIElement>) => {
    if (!(event.relatedTarget instanceof Node)) {
      setSubMenuPosition(undefined);
    } else if (subMenuPosition && itemRef?.current && !itemRef.current.contains(event.relatedTarget)) {
      setSubMenuPosition(undefined);
    }

    onClose && onClose(navbarItem);
  };

  return (
    <NavbarItemContext.Provider value={{ item: navbarItem, subMenuPosition, depth }}>
      <li
        ref={itemRef}
        className={`navbar-item ${disabled ? "disabled" : ""} ${onClick ? "on-click-animation" : ""} ${className}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </li>
    </NavbarItemContext.Provider>
  );
};

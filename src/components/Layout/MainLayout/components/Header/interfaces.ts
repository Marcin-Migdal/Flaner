import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { CSSProperties, MouseEvent } from "react";

export type HeaderItem = {
    text?: string;
    onClick?: (event: MouseEvent<HTMLLIElement>) => void;
    disabled?: boolean;
    subItems?: HeaderItem[];
    metaData?: any;
    icon?: IconProp;
};

export type OpenDirectionType = "left" | "right";

export type SubMenuPosition = Pick<CSSProperties, "left" | "right" | "top" | "minWidth" | "position" | "borderTop" | "zIndex"> & {
    openDirection?: OpenDirectionType;
};

export type MobileHeaderMenuOpenType = "mounted" | "opened" | "closing" | "closed";

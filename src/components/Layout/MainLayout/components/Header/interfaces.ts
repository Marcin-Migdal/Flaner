import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { CSSProperties, MouseEvent } from "react";

export type HeaderItem = {
    text: string;
    onClick?: (event: MouseEvent<HTMLLIElement>) => void;
    icon?: IconProp;
    disabled?: boolean;
    subItems?: HeaderItem[];
};

export type OpenDirectionType = "left" | "right";

export type SubListPosition = Pick<CSSProperties, "left" | "top" | "minWidth" | "position" | "borderTop" | "zIndex"> & {
    openDirection?: OpenDirectionType;
};

export type MobileHeaderMenuOpenType = "mounted" | "opened" | "closing" | "closed";

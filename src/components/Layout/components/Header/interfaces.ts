import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { CSSProperties, MouseEvent } from "react";

export type HeaderItems = {
    text: string;
    onClick?: (event: MouseEvent<HTMLLIElement>) => void;
    icon?: IconProp;
    disabled?: boolean;
    subItems?: HeaderItems[];
};

export type OpenDirectionType = "left" | "right";

export type SubListPosition = Pick<CSSProperties, "left" | "top" | "minWidth" | "position" | "borderTop" | "zIndex"> & {
    openDirection?: OpenDirectionType;
};

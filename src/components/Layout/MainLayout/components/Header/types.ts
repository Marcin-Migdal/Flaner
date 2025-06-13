import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { CSSProperties } from "react";

export type HeaderItem = {
  text?: string;
  onClick?: (event: React.MouseEvent<HTMLLIElement, MouseEvent>) => void;
  disabled?: boolean;
  subItems?: HeaderItem[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metaData?: any;
  icon?: IconProp;
};

export type OpenDirectionType = "left" | "right";

export type SubMenuPosition = Pick<
  CSSProperties,
  "left" | "right" | "top" | "minWidth" | "position" | "borderTop" | "zIndex"
> & {
  openDirection?: OpenDirectionType;
};

export type MobileHeaderMenuOpenType = "mounted" | "opened" | "closing" | "closed";

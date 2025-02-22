import { ProgressSpinner } from "@marcin-migdal/m-component-library";
import { CSSProperties } from "react";

export type SpinnerPlaceholderProps = {
  className?: string;
  style?: CSSProperties;
};

export const SpinnerPlaceholder = ({ className = "", style = {} }: SpinnerPlaceholderProps) => {
  return (
    <div style={style} className={`placeholder spinner-placeholder ${className}`}>
      <ProgressSpinner />
    </div>
  );
};

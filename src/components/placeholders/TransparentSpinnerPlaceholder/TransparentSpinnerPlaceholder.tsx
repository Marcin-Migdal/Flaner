import { ProgressSpinner } from "@marcin-migdal/m-component-library";
import { CSSProperties, PropsWithChildren } from "react";

import "./styles.scss";

export type TransparentSpinnerPlaceholderProps = {
  className?: string;
  style?: CSSProperties;
};

export const TransparentSpinnerPlaceholder = ({
  className = "",
  style = {},
  children,
}: PropsWithChildren<TransparentSpinnerPlaceholderProps>) => {
  return (
    <>
      <div style={style} className={`placeholder-container ${className}`}>
        {children}
        <div className="placeholder transparent-spinner-placeholder">
          <ProgressSpinner />
        </div>
      </div>
    </>
  );
};

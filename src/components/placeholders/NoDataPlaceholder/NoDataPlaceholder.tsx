import { CSSProperties } from "react";
import { useTranslation } from "react-i18next";

export type NoDataPlaceholderProps = {
  className?: string;
  style?: CSSProperties;
  message?: string;
};

export const NoDataPlaceholder = ({
  className = "",
  style = {},
  message = "No data to display",
}: NoDataPlaceholderProps) => {
  const { t } = useTranslation();

  return (
    <div style={style} className={`placeholder no-data ${className}`}>
      <h3>{t(message)}</h3>
    </div>
  );
};

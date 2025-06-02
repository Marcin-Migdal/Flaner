import { CSSProperties } from "react";
import { useTranslation } from "react-i18next";

export type ErrorPlaceholderProps = {
  className?: string;
  style?: CSSProperties;
  message?: string;
};

export const ErrorPlaceholder = ({ className = "", style = {}, message = "errors.default" }: ErrorPlaceholderProps) => {
  const { t } = useTranslation();

  return (
    <div style={style} className={`placeholder error ${className}`}>
      <h3>{t(message)}</h3>
    </div>
  );
};

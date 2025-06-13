import { CSSProperties } from "react";
import { useTranslation } from "react-i18next";

export type MessagePlaceholderProps = {
  className?: string;
  style?: CSSProperties;
  message?: string;
};

export const MessagePlaceholder = ({
  className = "",
  style = {},
  message = "common.noData",
}: MessagePlaceholderProps) => {
  const { t } = useTranslation();

  return (
    <div style={style} className={`placeholder message ${className}`}>
      <h3>{t(message)}</h3>
    </div>
  );
};

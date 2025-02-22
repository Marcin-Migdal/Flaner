import { CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import { I18NameSpace, useI18NameSpace } from "@hooks/index";

export type ErrorPlaceholderProps = {
  className?: string;
  style?: CSSProperties;
  message?: string;
  nameSpace?: I18NameSpace;
};

export const ErrorPlaceholder = ({
  className = "",
  style = {},
  message = "Error has occurred",
  nameSpace,
}: ErrorPlaceholderProps) => {
  const ns = useI18NameSpace(nameSpace, "errors");
  const { t } = useTranslation(ns);

  return (
    <div style={style} className={`placeholder error ${className}`}>
      <h3>{t(message, { ns })}</h3>
    </div>
  );
};

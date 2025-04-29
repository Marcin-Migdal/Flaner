import { Textfield, TextfieldProps } from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";

import { I18NameSpace, useI18NameSpace } from "../../../hooks";

export type CustomTextfieldPropsType = TextfieldProps & { nameSpace?: I18NameSpace };

export const CustomTextfield = ({
  nameSpace,
  label = undefined,
  placeholder = undefined,
  error = undefined,
  size = "medium",
  ...otherProps
}: CustomTextfieldPropsType) => {
  const ns: string[] = useI18NameSpace(nameSpace, "errors");
  const { t } = useTranslation(ns);

  return (
    <Textfield
      {...otherProps}
      label={label ? t(label, { ns: ns }) : undefined}
      placeholder={placeholder ? t(placeholder, { ns: ns }) : undefined}
      // error={error ? t(error, { ns: ns }) : undefined}
      error={error}
      size={size}
    />
  );
};

import { Textfield, TextfieldProps } from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";

export type CustomTextfieldPropsType = TextfieldProps;

export const CustomTextfield = ({
  label = undefined,
  placeholder = undefined,
  error = undefined,
  size = "medium",
  ...otherProps
}: CustomTextfieldPropsType) => {
  const { t } = useTranslation();

  return (
    <Textfield
      {...otherProps}
      label={label ? t(label) : undefined}
      placeholder={placeholder ? t(placeholder) : undefined}
      // error={error ? t(error) : undefined}
      error={error}
      size={size}
    />
  );
};

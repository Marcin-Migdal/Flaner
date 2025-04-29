import { Button, ButtonProps } from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";

type CustomButtonPropsType = ButtonProps;

export const CustomButton = ({ text, ...otherProps }: CustomButtonPropsType) => {
  const { t } = useTranslation();

  return <Button {...otherProps} text={text ? t(text) : undefined} />;
};

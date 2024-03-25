import { Button, IButtonProps } from "@Marcin-Migdal/morti-component-library";
import { useTranslation } from "react-i18next";
import React from "react";

type CustomButtonPropsType = IButtonProps & { i18NameSpace?: string };

export const CustomButton = ({ i18NameSpace, text, ...otherProps }: CustomButtonPropsType) => {
    const { t } = useTranslation(i18NameSpace);

    return <Button {...otherProps} text={t(text)} />;
};

import { Input, InputProps } from "@Marcin-Migdal/morti-component-library";
import { useTranslation } from "react-i18next";
import React from "react";

export type CustomTextfieldPropsType = InputProps & { i18NameSpace?: string };

export const CustomTextfield = ({
    i18NameSpace,
    label = undefined,
    placeholder = undefined,
    error = undefined,
    ...otherProps
}: CustomTextfieldPropsType) => {
    const { t } = useTranslation(i18NameSpace);

    return (
        <Input
            {...otherProps}
            label={label ? t(label) : undefined}
            placeholder={placeholder ? t(placeholder) : undefined}
            error={error ? t(error) : undefined}
        />
    );
};

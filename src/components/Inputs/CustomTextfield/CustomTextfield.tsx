import { Textfield, TextfieldProps } from "@Marcin-Migdal/morti-component-library";
import { useTranslation } from "react-i18next";

export type CustomTextfieldPropsType = TextfieldProps & { i18NameSpace?: string };

export const CustomTextfield = ({
    i18NameSpace,
    label = undefined,
    placeholder = undefined,
    error = undefined,
    size = "medium",
    ...otherProps
}: CustomTextfieldPropsType) => {
    const { t } = useTranslation(i18NameSpace);

    return (
        <Textfield
            {...otherProps}
            label={label ? t(label) : undefined}
            placeholder={placeholder ? t(placeholder) : undefined}
            error={error ? t(error) : undefined}
            size={size}
        />
    );
};

import { Button, IButtonProps } from "@Marcin-Migdal/morti-component-library";
import { useTranslation } from "react-i18next";

import { I18NameSpace, useI18NameSpace } from "@hooks/index";

type CustomButtonPropsType = IButtonProps & { nameSpace?: I18NameSpace };

export const CustomButton = ({ nameSpace, text, ...otherProps }: CustomButtonPropsType) => {
    const ns = useI18NameSpace(nameSpace);
    const { t } = useTranslation(ns);

    return <Button {...otherProps} text={t(text, { ns })} />;
};

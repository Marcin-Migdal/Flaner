import { CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import { I18NameSpace, useI18NameSpace } from "@hooks/index";

export type NoDataPlaceholderProps = {
    className?: string;
    style?: CSSProperties;
    message?: string;
    nameSpace?: I18NameSpace;
};

export const NoDataPlaceholder = ({ className = "", style = {}, message = "No data to display", nameSpace }: NoDataPlaceholderProps) => {
    const ns = useI18NameSpace(nameSpace);
    const { t } = useTranslation(ns);

    return (
        <div style={style} className={`placeholder no-data ${className}`}>
            <h3>{t(message, { ns })}</h3>
        </div>
    );
};

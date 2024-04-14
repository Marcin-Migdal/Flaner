import { ProgressSpinner } from "@Marcin-Migdal/morti-component-library";
import React, { CSSProperties } from "react";

type NoDataPlaceholderProps = {
    className?: string;
    style?: CSSProperties;
};

export const SpinnerPlaceholder = ({ className = "", style = {} }: NoDataPlaceholderProps) => {
    return (
        <div style={style} className={`placeholder ${className}`}>
            <ProgressSpinner />
        </div>
    );
};

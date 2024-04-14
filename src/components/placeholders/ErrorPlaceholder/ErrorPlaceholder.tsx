import React, { CSSProperties } from "react";

type ErrorPlaceholderProps = {
    className?: string;
    style?: CSSProperties;
    message?: string;
};

export const ErrorPlaceholder = ({ className = "", style = {}, message = "Error has occurred" }: ErrorPlaceholderProps) => {
    return (
        <div style={style} className={`placeholder ${className}`}>
            {message}
        </div>
    );
};

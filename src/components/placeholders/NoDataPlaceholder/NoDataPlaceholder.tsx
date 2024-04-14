import React, { CSSProperties } from "react";

type NoDataPlaceholderProps = {
    className?: string;
    style?: CSSProperties;
    message?: string;
};

export const NoDataPlaceholder = ({ className = "", style = {}, message = "No data to display" }: NoDataPlaceholderProps) => {
    return (
        <div style={style} className={`placeholder ${className}`}>
            {message}
        </div>
    );
};

import { CSSProperties, PropsWithChildren } from "react";

import "./styles.scss";

type PageProps = {
    className?: string;
    style?: CSSProperties;

    flex?: boolean;
    center?: boolean;
    align?: boolean;
    justify?: boolean;
    "flex-column"?: boolean;
    "flex-row"?: boolean;
};

export const Page = ({ children, style = {}, ...other }: PropsWithChildren<PageProps>) => {
    const classNames: string = getClasses(other);

    return (
        <div style={style} className={classNames}>
            {children}
        </div>
    );
};

const getClasses = ({ className, ...other }: PageProps): string => {
    let classNames: string = "page";

    Object.entries(other).forEach(([key, value]) => {
        if (value) classNames = classNames.concat(` ${key}`);
    });

    return className ? classNames.concat(` ${className}`) : classNames;
};

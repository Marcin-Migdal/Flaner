import { useMemo } from "react";

export type I18NameSpace = string | string[];

export const useI18NameSpace = (nameSpace: I18NameSpace | undefined, defaultNameSpace?: string): string[] => {
    const ns = useMemo(() => {
        const ns: string[] = defaultNameSpace ? [defaultNameSpace] : [];

        if (nameSpace) {
            Array.isArray(nameSpace) ? ns.push(...nameSpace) : ns.push(nameSpace);
        }

        return ns;
    }, [nameSpace]);

    return ns;
};

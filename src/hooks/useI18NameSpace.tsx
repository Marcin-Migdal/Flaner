import { useMemo } from "react";

export type I18NameSpace = string | string[];

export const useI18NameSpace = (nameSpace: I18NameSpace | undefined, defaultNameSpace?: string): string[] => {
  const ns = useMemo(() => {
    const nsResult: string[] = defaultNameSpace ? [defaultNameSpace] : [];

    if (nameSpace) {
      Array.isArray(nameSpace) ? nsResult.push(...nameSpace) : nsResult.push(nameSpace);
    }

    return nsResult;
  }, [nameSpace]);

  return ns;
};

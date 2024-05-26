import { useEffect, useState } from "react";

type BreakPointType = `(max-width: ${number}px)` | `(min-width: ${number}px)`;

export const useBreakpoint = (breakpoint: BreakPointType): boolean => {
    const [breakPointResult, setBreakPointResult] = useState<boolean>(getBreakPointResult(breakpoint));

    useEffect(() => {
        const handleResize = () => {
            const newBreakPointResult = getBreakPointResult(breakpoint);

            if (breakPointResult !== newBreakPointResult) {
                setBreakPointResult(newBreakPointResult);
            }
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [breakPointResult]);

    return breakPointResult;
};

const getBreakPointResult = (breakpoint: BreakPointType): boolean => {
    const width: number = parseInt(breakpoint.replace(/\D/g, ""));

    if (breakpoint.includes("max-width")) return window.innerWidth <= width;
    return window.innerWidth >= width;
};

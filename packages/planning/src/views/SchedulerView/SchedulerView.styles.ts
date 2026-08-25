import { cn } from "@flaner/shared/utils";

/**
 * Główne style układu responsywnego dla widoku SchedulerView
 */
export const schedulerViewStyles = {
  root: cn(
    // Base (Mobile)
    "flex flex-col h-auto w-full max-w-[1920px] mx-auto p-0 gap-3 overflow-y-auto bg-background text-foreground",
    // Tablet (SM / MD)
    "sm:p-4 md:p-6 sm:gap-4",
    // Desktop (min-1200px)
    "min-[1200px]:flex-row min-[1200px]:h-[calc(100vh-6rem)] min-[1200px]:overflow-hidden min-[1200px]:gap-6",
  ),
  calendarPanelWrapper: "flex-1 flex flex-col relative z-10 min-w-0 min-h-[500px] min-[1200px]:min-h-0",
  controlPanelWrapper: "w-full min-[1200px]:w-[350px] relative shrink-0 rounded-3xl flex flex-col shadow-[20px_0_40px_-15px_rgba(0,0,0,0.5)]",
};

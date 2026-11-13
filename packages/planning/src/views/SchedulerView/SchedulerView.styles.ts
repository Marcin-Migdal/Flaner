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
    "split:flex-row split:h-[calc(100vh-6rem)] split:overflow-hidden split:gap-6",
  ),
  calendarPanelWrapper: "flex-1 flex flex-col relative z-10 min-w-0 min-h-[500px] split:min-h-0",
  controlPanelWrapper: "w-full split:w-[350px] relative shrink-0 rounded-3xl flex flex-col shadow-drawer",
};

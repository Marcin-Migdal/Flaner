import { cva } from "class-variance-authority";

export type MonthViewPosition = "single" | "start" | "middle" | "end";

export const monthViewEventSegmentVariants = cva(
  [
    "group/event flex items-center justify-between truncate cursor-pointer select-none box-border",
    "mb-[1px] md:mb-0.5 transition-all duration-150 ease-in-out",
  ],
  {
    variants: {
      position: {
        single: "rounded-[3px] md:rounded-md px-[1px] md:px-2",
        start: "rounded-l-[3px] md:rounded-l-md rounded-r-none pl-[1px] md:pl-2 pr-[1px]",
        middle: "rounded-none px-[1px]",
        end: "rounded-r-[3px] md:rounded-r-md rounded-l-none pl-[1px] pr-[1px] md:pr-2",
      },
      continuesNextInRow: {
        true: "w-[calc(100%+1px)] -mr-[1px] relative z-[1]",
        false: "w-full",
      },
      hasColor: {
        true: "text-white",
        false: "bg-brand/10 text-brand-foreground hover:bg-brand/20",
      },
      isHovered: {
        true: "z-10 shadow-md ring-1 ring-white/40 brightness-105",
        false: "",
      },
    },
    defaultVariants: {
      position: "single",
      continuesNextInRow: false,
      hasColor: false,
      isHovered: false,
    },
  },
);

export const monthViewDayNumberVariants = cva(
  "text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center transition-colors",
  {
    variants: {
      isToday: {
        true: "bg-brand text-brand-foreground font-bold shadow-sm",
        false: "text-foreground/80",
      },
    },
    defaultVariants: {
      isToday: false,
    },
  },
);

export const monthViewStyles = {
  root: "flex flex-col flex-1 min-h-full",
  weekdayHeaders:
    "grid grid-cols-7 border-b text-center text-xs font-semibold text-muted-foreground py-2 bg-muted/30 shrink-0 sticky top-0 z-20 backdrop-blur-md",
  grid: "grid grid-cols-7 flex-1 divide-x divide-y border-b",
  dayHeader: "flex items-center justify-between px-2 pt-1 pb-0.5 shrink-0",
  emptySlot: "mb-[1px] md:mb-0.5 shrink-0 select-none pointer-events-none box-border",
  removeEventButton:
    "opacity-0 group-hover/event:opacity-100 hover:text-destructive hover:bg-background/20 h-full p-0 md:p-0.5 max-h-full rounded transition-all duration-150 flex items-center justify-center shrink-0 ml-auto [&_svg]:size-2.5 md:[&_svg]:size-3",
};

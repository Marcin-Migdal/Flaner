import { cva } from "class-variance-authority";

export const customSlotsStyles = {
  content:
    "py-4 px-5 sm:px-6 bg-zinc-950/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl flex flex-col gap-3 text-foreground select-none z-50 transition-all duration-200",
  contentPresets: "w-[calc(100vw-2rem)] max-w-[340px] sm:max-w-none sm:w-[550px]",
  contentCustom: "w-[calc(100vw-2rem)] max-w-[340px] sm:max-w-none sm:w-[380px]",
  twoColumnContainer: "flex flex-col sm:flex-row gap-5 items-stretch",
  calendarColumn: "flex flex-col justify-center items-center w-full sm:w-auto sm:border-r sm:border-border/50 sm:pr-5 shrink-0 self-stretch",
  optionsColumn: "flex-1 flex flex-col justify-between gap-2 w-full min-w-0 sm:w-[240px] shrink-0",
  presetList: "flex flex-col gap-0.5",
  divider: "h-px bg-border/60 my-1",
  header: "flex items-center gap-2 pb-2 border-b border-border/50",
  backButton: "h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/5 inline-flex items-center justify-center cursor-pointer transition-colors",
  title: "text-sm font-semibold text-foreground flex-1 truncate",
  section: "flex flex-col gap-2",
  sectionLabel: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wider",
  dateRangeRow: "grid grid-cols-2 gap-2 items-center",
  everyRow: "flex items-center gap-2",
  everyLabel: "text-xs font-medium text-muted-foreground shrink-0",
  weekDaysRow: "flex items-center justify-between gap-1 py-1",
  monthTabsContainer: "flex items-center rounded-lg bg-zinc-900/80 p-0.5 border border-border/50",
  monthDaysGrid: "grid grid-cols-7 gap-1 py-1 text-center items-center justify-items-center",
  monthSelectsRow: "grid grid-cols-2 gap-2",
  optionsSection: "flex flex-col gap-3 pt-3 border-t border-border/50",
  footer: "flex items-center justify-end gap-2 pt-3 border-t border-border/50 w-full",
  cancelButton: "h-8 px-3 text-xs rounded-lg cursor-pointer",
  okButton: "h-8 px-4 text-xs bg-brand text-zinc-950 hover:bg-brand/90 font-semibold shadow-sm rounded-lg cursor-pointer transition-colors",
};

export const presetItemVariants = cva(
  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer",
  {
    variants: {
      isCustom: {
        true: "text-brand hover:bg-brand/10 font-semibold",
        false: "text-foreground hover:bg-white/5",
      },
      active: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        isCustom: false,
        active: true,
        class: "bg-brand/10 text-brand font-semibold hover:bg-brand/15",
      },
      {
        isCustom: true,
        active: true,
        class: "bg-brand/15 text-brand font-semibold hover:bg-brand/20",
      },
    ],
    defaultVariants: {
      isCustom: false,
      active: false,
    },
  },
);

export const weekdayCircleVariants = cva(
  "size-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all cursor-pointer select-none",
  {
    variants: {
      active: {
        true: "bg-brand text-zinc-950 shadow-md font-bold scale-105",
        false: "text-muted-foreground hover:text-foreground hover:bg-white/5",
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

export const monthDayCellVariants = cva(
  "size-7 rounded-full flex items-center justify-center text-[11px] font-medium transition-all cursor-pointer select-none",
  {
    variants: {
      active: {
        true: "bg-brand text-zinc-950 shadow-sm font-bold scale-105",
        false: "text-foreground/80 hover:text-foreground hover:bg-white/5",
      },
      isLastDay: {
        true: "col-span-3 rounded-xl px-2 w-auto justify-center text-xs",
        false: "",
      },
    },
    defaultVariants: {
      active: false,
      isLastDay: false,
    },
  },
);

export const monthTabButtonVariants = cva(
  "flex-1 py-1 text-xs font-medium rounded-md transition-all text-center cursor-pointer select-none",
  {
    variants: {
      active: {
        true: "bg-zinc-800 text-foreground font-semibold shadow-xs",
        false: "text-muted-foreground hover:text-foreground",
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

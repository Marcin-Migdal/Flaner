import { cva } from "@flaner/shared/utils";

export const filterTriggerVariants = cva(
  "inline-flex items-center justify-center gap-1.5 h-8 px-2 min-[1438px]:px-2.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer select-none shrink-0",
  {
    variants: {
      active: {
        true: "border border-brand/40 bg-brand/10 text-brand hover:bg-brand/15 shadow-[0_0_12px_rgba(237,173,94,0.15)]",
        false: "border border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground hover:bg-white/5",
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

export const scopeButtonVariants = cva(
  "py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all duration-150 text-center truncate cursor-pointer select-none",
  {
    variants: {
      active: {
        true: "bg-brand/15 text-brand border border-brand/30 shadow-xs font-semibold",
        false: "text-muted-foreground/80 hover:text-foreground hover:bg-white/5",
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

export const expenseFilterPopoverStyles = {
  filterButtonLabel: "hidden min-[1438px]:inline",
  popoverContent:
    "w-[340px] sm:w-[380px] p-4 rounded-2xl bg-[#141416]/95 border border-white/10 shadow-2xl backdrop-blur-xl flex flex-col gap-3.5 z-50",
  header: "flex items-center justify-between pb-1 border-b border-white/5",
  title: "text-xs font-bold uppercase tracking-wider text-muted-foreground/80",
  badge:
    "text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand/15 text-brand border border-brand/20 tabular-nums",
  fieldGroup: "flex flex-col gap-1.5",
  fieldLabel: "text-[11px] font-semibold text-muted-foreground/90 uppercase tracking-wider",
  searchInputWrapper: "relative flex items-center",
  searchIcon: "absolute left-3 size-3.5 text-muted-foreground/50 pointer-events-none",
  searchInput:
    "pl-9 h-9 text-xs bg-white/[0.04] border border-white/10 rounded-xl focus-visible:border-brand/40 w-full placeholder:text-muted-foreground/50",
  scopeGrid: "grid grid-cols-3 gap-1 p-0.5 rounded-xl bg-white/[0.03] border border-white/5",
  selectInput:
    "h-9 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-foreground px-3 py-1.5 focus:border-brand/40 focus:outline-none w-full",
  selectOption: "bg-[#18181b] text-foreground",
  dateRow: "grid grid-cols-2 gap-2",
  dateField: "flex flex-col gap-1",
  dateLabel: "text-[10px] text-muted-foreground/70",
  datePickerButton:
    "h-9 px-2.5 text-xs bg-white/[0.04] border border-white/10 hover:border-brand/40 text-foreground rounded-xl w-full justify-start [&>svg]:size-3.5 [&>svg]:mr-1.5 shadow-none",
  footer: "flex items-center justify-between gap-2 pt-2 border-t border-white/5",
  resetDraftButton:
    "h-8 px-2.5 rounded-lg text-xs text-muted-foreground/80 hover:text-foreground hover:bg-white/5 cursor-pointer",
  applyButton:
    "h-8 px-4 rounded-xl text-xs font-semibold bg-brand text-black hover:bg-brand/90 transition-colors cursor-pointer",
  mobileBackdrop: "fixed inset-0 z-50 bg-transparent",
  mobileContainer:
    "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-[360px] max-h-[85dvh] p-4 rounded-2xl bg-[#141416]/95 border border-white/10 shadow-2xl backdrop-blur-xl flex flex-col gap-3.5 overflow-y-auto outline-hidden",
  closeButton:
    "size-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer",
};

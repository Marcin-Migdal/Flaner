import { cva } from "@flaner/shared/utils";

export const memberBalanceVariants = cva("text-sm font-semibold tabular-nums text-right whitespace-nowrap", {
  variants: {
    tone: {
      positive: "text-emerald-500",
      negative: "text-rose-500",
      neutral: "text-muted-foreground",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

export const balancesTabStyles = {
  root: "flex flex-col gap-6",
  accordion: "flex flex-col gap-3",
  accordionItem:
    "rounded-2xl border border-white/5 bg-white/[0.02] px-3.5 min-[1438px]:px-4 overflow-hidden last:border-b transition-all duration-200",
  accordionTrigger:
    "py-3.5 hover:no-underline text-xs font-bold uppercase tracking-widest text-muted-foreground/80 hover:text-foreground cursor-pointer select-none",
  accordionContent: "pt-1 pb-3 flex flex-col gap-3",
  transfersHeaderRow: "flex items-center justify-between gap-2 py-3.5 w-full",
  titleWrapper: "flex-1 min-w-0 flex items-center",
  transfersTriggerLeft:
    "py-0 hover:no-underline text-xs font-bold uppercase tracking-widest text-muted-foreground/80 hover:text-foreground cursor-pointer select-none [&>svg]:hidden w-full text-left truncate",
  switchWrapper: "flex items-center gap-1.5 shrink-0",
  simplifySwitch:
    "w-auto py-0 gap-2 [&>div:first-child]:max-w-[200px] min-[1438px]:[&>div:first-child]:max-w-[260px] [&>div:first-child]:pr-0 [&_[data-slot=field-label]]:text-xs [&_[data-slot=field-label]]:font-medium [&_[data-slot=field-label]]:text-foreground [&_[data-slot=field-label]]:whitespace-nowrap [&_[data-slot=field-description]]:hidden min-[1438px]:[&_[data-slot=field-description]]:block [&_[data-slot=field-description]]:text-[11px] [&_[data-slot=field-description]]:leading-snug [&_[data-slot=field-description]]:text-muted-foreground/75",
  chevronWrapper: "shrink-0 flex items-center",
  transfersTriggerChevron:
    "p-1.5 hover:no-underline cursor-pointer select-none text-muted-foreground/80 hover:text-foreground [&>span]:hidden rounded-lg hover:bg-white/5",
  section: "flex flex-col gap-3",
  sectionHeader: "flex flex-col sm:flex-row sm:items-center justify-between gap-2",
  sectionTitle: "text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest px-1",
  members:
    "grid grid-cols-1 min-[1438px]:grid-cols-2 gap-2 max-h-[340px] sm:max-h-[248px] overflow-y-auto px-0.5 pb-0.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb:hover]:bg-white/25 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]",
  memberRow:
    "flex items-center gap-2.5 min-[1438px]:gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-2.5 min-[1438px]:p-3 transition-colors",
  memberAvatar: "size-8 shrink-0",
  memberAvatarFallback: "text-xs font-semibold",
  memberName: "flex-1 min-w-0 text-sm font-medium truncate cursor-default",
  memberBalances: "flex flex-col items-end gap-0.5 shrink-0 ml-auto",
  debts:
    "flex flex-col gap-2 max-h-[340px] sm:max-h-[640px] overflow-y-auto px-0.5 pb-0.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb:hover]:bg-white/25 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]",
  settledState:
    "flex items-center justify-center gap-2 py-8 rounded-2xl border border-dashed border-emerald-500/20 text-sm text-emerald-500",
  settledIcon: "size-4",
};

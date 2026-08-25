/**
 * Style układu i komponentów widoku szczegółów grupy (GroupDetailsView)
 */
export const groupDetailsViewStyles = {
  root: "max-w-4xl mx-auto py-6 space-y-8 px-4 md:px-0",
  backButtonContainer: "flex items-center gap-4 mb-2",
  headerCard:
    "relative bg-card border border-border/50 rounded-3xl p-5 md:p-6 shadow-sm overflow-hidden flex flex-col lg:flex-row gap-5 lg:gap-6 lg:items-center justify-between",
  groupInfoWrapper: "flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center flex-1 min-w-0",
  avatar:
    "shrink-0 size-20 sm:size-24 md:size-24 rounded-2xl bg-gradient-to-br from-brand/20 to-brand/5 flex items-center justify-center text-brand font-bold text-2xl sm:text-3xl shadow-inner border border-brand/10 overflow-hidden",
  infoContent: "flex-1 min-w-0 flex flex-col gap-1.5",
  title: "text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight break-normal [overflow-wrap:anywhere]",
  description: "text-muted-foreground text-xs sm:text-sm leading-relaxed max-w-2xl",
  badgeList: "flex flex-wrap items-center gap-2 mt-1",
  badge:
    "flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-muted/60 rounded-full border border-border/40 text-[11px] sm:text-xs font-semibold text-muted-foreground",
  actionButtonsWrapper:
    "flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto shrink-0 pt-2 lg:pt-0 border-t border-border/30 lg:border-t-0",
  actionButton:
    "rounded-xl h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm font-semibold flex-1 lg:flex-none flex items-center justify-center gap-1.5 cursor-pointer transition-all",
  membersSection: "space-y-4",
  membersCard: "bg-card border border-border/50 rounded-2xl overflow-hidden",
  memberRow: "flex items-center justify-between p-4 hover:bg-muted/30 transition-colors",
  memberRoleBadge: "text-xs font-medium px-2 py-1 bg-brand/10 text-brand rounded-md uppercase tracking-wider",
};

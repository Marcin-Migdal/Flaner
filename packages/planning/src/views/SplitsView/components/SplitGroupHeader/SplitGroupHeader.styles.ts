export const splitGroupHeaderStyles = {
  root: "flex flex-wrap items-start gap-x-3 gap-y-4",
  backButton: "lg:hidden shrink-0 -ml-1 rounded-xl",
  titleBlock: "flex-1 min-w-0 flex flex-col gap-2",
  title: "text-2xl sm:text-3xl font-extrabold tracking-tight truncate",
  description: "text-sm text-muted-foreground leading-relaxed break-normal [overflow-wrap:anywhere]",
  membersRow: "flex items-center flex-wrap pr-2 pb-2 mt-1 max-w-full",
  avatarButton:
    "rounded-full cursor-pointer hover:opacity-85 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none shrink-0 -mr-2 -mb-2",
  avatar: "size-9 ring-2 ring-card",
  avatarFallback: "text-xs font-semibold",
  overflowBadge:
    "size-9 rounded-full ring-2 ring-card bg-muted text-muted-foreground text-xs font-semibold flex items-center justify-center shrink-0 -mr-2 -mb-2 cursor-pointer hover:opacity-85 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none",
  avatarSkeleton: "size-9 rounded-full ring-2 ring-card bg-white/10 animate-pulse shrink-0 -mr-2 -mb-2",
  actions: "flex items-center gap-2 shrink-0 self-start sm:self-center ml-auto",
  primaryAction:
    "h-10 rounded-xl size-10 p-0 @[500px]:size-auto @[500px]:h-10 @[500px]:px-4 shrink-0 transition-all",
  primaryActionLabel: "hidden @[500px]:inline",
  secondaryAction:
    "h-10 rounded-xl size-10 p-0 @[500px]:size-auto @[500px]:h-10 @[500px]:px-4 shrink-0 transition-all",
  secondaryActionLabel: "hidden @[500px]:inline",
};

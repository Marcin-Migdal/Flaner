/**
 * Style układu dla bocznego panelu zarządzania grupą (ManageGroupSheet)
 */
export const manageGroupSheetStyles = {
  sheetContent:
    "w-full max-w-full data-[side=right]:w-full data-[side=right]:sm:max-w-[500px] data-[side=right]:sm:w-[500px] p-0 gap-0 bg-card/95 backdrop-blur-md border-l border-border flex flex-col h-full shadow-2xl",
  sheetHeader: "px-6 pt-6 pb-4 border-b border-border shrink-0",
  bodyContainer: "flex-1 overflow-y-auto px-6 py-2 min-h-0 flex flex-col",
  accordion: "w-full divide-y divide-border/60",
  accordionItem: "border-b border-border/60 last:border-b-0 py-1",
  accordionTrigger:
    "text-xs font-bold uppercase tracking-wider text-muted-foreground/80 hover:text-foreground hover:no-underline py-3.5 px-0.5 flex items-center justify-between",
  accordionContent: "pt-1 pb-4 px-0.5",
  editForm: "space-y-3",
  membersList: "space-y-2 pr-1 pb-1 pt-1",
  memberItem:
    "flex items-center justify-between p-3 rounded-xl bg-card border border-border/60 hover:border-border shadow-2xs transition-all",
  dangerZone: "p-6 pt-4 border-t border-border/60 shrink-0 bg-card/95 backdrop-blur-xs mt-auto",
  deleteButton:
    "w-full text-destructive border-destructive/30 hover:bg-destructive hover:text-white rounded-xl h-10 font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer",
};

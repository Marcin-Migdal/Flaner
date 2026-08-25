/**
 * Style układu dla bocznego panelu zarządzania grupą (ManageGroupSheet)
 */
export const manageGroupSheetStyles = {
  sheetContent:
    "w-full max-w-full data-[side=right]:w-full data-[side=right]:sm:max-w-[500px] data-[side=right]:sm:w-[500px] p-0 gap-0 bg-card/95 backdrop-blur-md border-l border-border flex flex-col h-full shadow-2xl",
  sheetHeader: "px-6 pt-6 pb-4 border-b border-border shrink-0",
  bodyContainer: "flex-1 overflow-y-auto space-y-5 px-6 pt-4 pb-6 flex flex-col min-h-0",
  editSection: "space-y-4 pb-5 border-b border-border/60 shrink-0",
  membersSection: "space-y-2.5 pt-1 flex-1 min-h-[238px] flex flex-col pb-2",
  membersHeader:
    "text-xs font-bold uppercase tracking-wider text-muted-foreground/80 px-0.5 flex items-center justify-between shrink-0",
  membersList: "space-y-2 overflow-y-auto pr-1 pb-3 pt-0.5 flex-1 min-h-[228px]",
  memberItem:
    "flex items-center justify-between p-3 rounded-xl bg-card border border-border/60 hover:border-border shadow-2xs transition-all",
  dangerZone: "pt-4 border-t border-border/60 mt-auto shrink-0",
  deleteButton:
    "w-full text-destructive border-destructive/30 hover:bg-destructive hover:text-white rounded-xl h-10 font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer",
};

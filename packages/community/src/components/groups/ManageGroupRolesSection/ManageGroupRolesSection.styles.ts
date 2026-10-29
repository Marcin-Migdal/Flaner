/**
 * Style dla komponentu zarządzania uprawnieniami ról w ManageGroupSheet (Ścieżka 1: Role Tabs Matrix)
 */
export const manageGroupRolesSectionStyles = {
  container: "space-y-4 pt-1",
  rolesDesc: "text-xs text-muted-foreground px-0.5",
  tabsList: "w-full grid grid-cols-3 h-10 p-1 bg-muted/60 rounded-xl",
  tabsTrigger:
    "flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all cursor-pointer",
  permissionsList: "space-y-2.5 pt-1",
  permissionCard:
    "flex items-center justify-between p-3 rounded-xl bg-card border border-border/60 hover:border-border/90 shadow-2xs transition-all gap-3",
  permissionInfo: "flex-1 min-w-0 flex flex-col gap-0.5",
  permissionTitle: "text-xs font-semibold text-foreground flex items-center gap-1.5",
  permissionDesc: "text-[11px] text-muted-foreground leading-tight",
  saveButton: "w-full rounded-xl h-10 font-semibold mt-2",
};

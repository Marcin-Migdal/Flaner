/**
 * Style układu i komponentów widoku ustawień (SettingsView)
 */
export const settingsViewStyles = {
  root: "max-w-4xl mx-auto py-4",
  backButtonContainer: "flex items-center gap-2 mb-6 group cursor-pointer w-fit",
  backButton: "rounded-full hover:bg-muted text-muted-foreground group-hover:text-foreground transition-colors",
  backText: "text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors select-none",
  title: "text-3xl font-black tracking-tight text-foreground mb-8 font-heading",
  form: "space-y-8",
  sectionGrid: "grid grid-cols-1 md:grid-cols-3 gap-6",
  sectionHeader: "md:col-span-1",
  sectionTitle: "text-lg font-bold text-foreground/90",
  sectionDesc: "text-xs text-muted-foreground mt-1",
  card: "md:col-span-2 bg-card/40 border border-border rounded-xl p-6 shadow-xl space-y-6",
  avatarWrapper: "flex items-center gap-5",
  avatarPreview: "w-16 h-16 rounded-full object-cover border-2 border-border bg-background",
  avatarPlaceholder:
    "w-16 h-16 rounded-full bg-gradient-to-tr from-brand to-brand-dark flex items-center justify-center text-zinc-950 font-black text-xl border-2 border-brand/20 shadow-md",
  profileInfo: "flex flex-col",
  profileUsername: "text-sm font-semibold text-foreground/80",
  profileEmail: "text-xs text-muted-foreground mt-0.5",
  fieldsSpacing: "space-y-4",
  separator: "border-border",
  actionsContainer: "flex justify-end gap-3 pt-4",
  submitButton: "px-6 h-10 shadow-lg shadow-brand/10",
};

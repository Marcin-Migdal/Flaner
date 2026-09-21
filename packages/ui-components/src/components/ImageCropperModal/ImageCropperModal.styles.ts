import { cn } from "@flaner/shared/utils";

export const imageCropperModalStyles = {
  dialogContent: cn(
    "sm:max-w-[500px] w-full p-6 gap-5 bg-card/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl overflow-hidden flex flex-col"
  ),
  cropperWrapper: cn(
    "relative w-full h-[300px] sm:h-[340px] bg-zinc-950 rounded-xl overflow-hidden border border-border/60 shadow-inner"
  ),
  controlsContainer: cn(
    "flex flex-col gap-4 py-1"
  ),
  sliderRow: cn(
    "flex items-center gap-3 w-full text-muted-foreground"
  ),
  slider: cn(
    "flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-brand transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
  ),
  actionsRow: cn(
    "flex items-center justify-between gap-3 pt-1 border-t border-border/40"
  ),
  footer: cn(
    "-mx-6 -mb-6 mt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 p-4 bg-muted/40 border-t border-border/50"
  ),
};

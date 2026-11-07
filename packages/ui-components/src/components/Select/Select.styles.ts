import { cva } from "class-variance-authority";

export const selectControlVariants = cva("border transition-all", {
  variants: {
    variant: {
      default: "rounded-lg bg-transparent dark:bg-input/30 min-h-[40px] text-sm duration-200 border-input hover:border-accent",
      glass:
        "rounded-xl backdrop-blur-md shadow-sm min-h-[36px] md:min-h-[44px] text-xs md:text-sm duration-300 border-border-subtle bg-surface-subtle hover:bg-surface-hover hover:border-border",
    },
    state: {
      idle: "cursor-pointer",
      focused: "cursor-pointer",
      error: "cursor-pointer",
      disabled: "cursor-not-allowed opacity-50 bg-input/20 dark:bg-input/50 hover:border-input",
    },
  },
  compoundVariants: [
    { variant: "default", state: "focused", class: "border-ring ring-1 ring-ring" },
    { variant: "default", state: "error", class: "border-destructive focus-visible:ring-destructive" },
    { variant: "default", state: "disabled", class: "border-input/50 opacity-50 bg-input/20 dark:bg-input/50" },
    {
      variant: "glass",
      state: "focused",
      class: "border-brand/40 bg-surface-hover shadow-glow-brand",
    },
    { variant: "glass", state: "error", class: "border-destructive bg-destructive/10" },
    { variant: "glass", state: "disabled", class: "opacity-40 bg-transparent border-border-subtle shadow-none" },
  ],
  defaultVariants: {
    variant: "default",
    state: "idle",
  },
});

export const selectOptionVariants = cva("group px-3 text-sm cursor-pointer transition-colors whitespace-nowrap", {
  variants: {
    variant: {
      default: "py-2 duration-150 text-foreground/80 hover:text-foreground",
      glass: "py-2.5 duration-200 rounded-xl w-full text-foreground/70 hover:text-foreground hover:bg-surface-subtle",
    },
    state: {
      idle: "",
      focused: "",
      selected: "",
    },
  },
  compoundVariants: [
    { variant: "default", state: "focused", class: "bg-accent text-accent-foreground" },
    { variant: "default", state: "selected", class: "bg-brand text-brand-foreground font-semibold" },
    { variant: "glass", state: "focused", class: "bg-surface-hover text-foreground" },
    { variant: "glass", state: "selected", class: "bg-brand-subtle text-brand-text font-bold" },
  ],
  defaultVariants: {
    variant: "default",
    state: "idle",
  },
});

import { cva } from "class-variance-authority";

export const selectControlVariants = cva("border transition-all cursor-pointer", {
  variants: {
    variant: {
      default: "rounded-lg bg-background min-h-[40px] text-sm duration-200 border-input hover:border-accent",
      glass:
        "rounded-xl backdrop-blur-md shadow-sm min-h-[36px] md:min-h-[44px] text-xs md:text-sm duration-300 border-white/5 bg-white/[0.04] hover:bg-white/[0.06] hover:border-white/10",
    },
    state: {
      idle: "",
      focused: "",
      error: "",
    },
  },
  compoundVariants: [
    { variant: "default", state: "focused", class: "border-ring ring-1 ring-ring" },
    { variant: "default", state: "error", class: "border-destructive focus-visible:ring-destructive" },
    {
      variant: "glass",
      state: "focused",
      class: "border-brand/40 bg-white/[0.08] shadow-[0_0_15px_-3px_rgba(255,165,0,0.15)]",
    },
    { variant: "glass", state: "error", class: "border-destructive bg-destructive/10" },
  ],
  defaultVariants: {
    variant: "default",
    state: "idle",
  },
});

export const selectOptionVariants = cva("group px-3 text-sm cursor-pointer transition-colors", {
  variants: {
    variant: {
      default: "py-2 duration-150 text-foreground/80 hover:text-foreground",
      glass: "py-2.5 duration-200 rounded-xl w-full text-foreground/70 hover:text-foreground hover:bg-white/5",
    },
    state: {
      idle: "",
      focused: "",
      selected: "",
    },
  },
  compoundVariants: [
    { variant: "default", state: "focused", class: "bg-accent text-accent-foreground" },
    { variant: "default", state: "selected", class: "bg-brand text-zinc-950 font-semibold" },
    { variant: "glass", state: "focused", class: "bg-white/10 text-foreground" },
    { variant: "glass", state: "selected", class: "bg-brand/15 text-brand font-bold" },
  ],
  defaultVariants: {
    variant: "default",
    state: "idle",
  },
});

import { cn, cva } from "@flaner/shared/utils";

export type SlotPosition = "single" | "start" | "middle" | "end";
export type SlotHighlight = "none" | "top" | "winning";

/**
 * Główny kontener segmentu slotu kalendarza
 */
export const slotSegmentRootVariants = cva(
  [
    // Base styles
    "@container box-border group/slotSegment flex items-center shrink-0 select-none overflow-visible relative transition-all duration-150",
    "hover:z-[50] group-hover/slotSegment:z-[50]",
  ],
  {
    variants: {
      position: {
        single: "rounded-[3px] md:rounded-md px-1",
        start: "rounded-l-[3px] md:rounded-l-md rounded-r-none pl-1 pr-0.5",
        middle: "rounded-none px-0",
        end: "rounded-r-[3px] md:rounded-r-md rounded-l-none pl-0 pr-1",
      },
      continuesNextInRow: {
        true: "w-[calc(100%+1px)] -mr-[1px] relative z-[1]",
        false: "w-full",
      },
      highlight: {
        none: "border-transparent",
        top: "border-amber-400 dark:border-amber-300 z-10",
        winning: "border-emerald-400 z-20",
      },
      isHovered: {
        true: "z-[50]",
        false: "",
      },
    },
    compoundVariants: [
      // SINGLE with HIGHLIGHT
      {
        position: "single",
        highlight: ["top", "winning"],
        class: "border md:border-2",
      },
      {
        position: "single",
        highlight: "none",
        class: "border md:border-2 border-transparent",
      },
      // START with HIGHLIGHT
      {
        position: "start",
        highlight: ["top", "winning"],
        class: "border-y border-l border-r-0 md:border-y-2 md:border-l-2 md:border-r-0",
      },
      {
        position: "start",
        highlight: "none",
        class: "border-y border-l border-r-0 md:border-y-2 md:border-l-2 md:border-r-0 border-transparent",
      },
      // END with HIGHLIGHT
      {
        position: "end",
        highlight: ["top", "winning"],
        class: "border-y border-r border-l-0 md:border-y-2 md:border-r-2 md:border-l-0",
      },
      {
        position: "end",
        highlight: "none",
        class: "border-y border-r border-l-0 md:border-y-2 md:border-r-2 md:border-l-0 border-transparent",
      },
      // MIDDLE with HIGHLIGHT
      {
        position: "middle",
        highlight: ["top", "winning"],
        class: "border-y border-x-0 md:border-y-2 md:border-x-0",
      },
      {
        position: "middle",
        highlight: "none",
        class: "border-y border-x-0 md:border-y-2 md:border-x-0 border-transparent",
      },
    ],
    defaultVariants: {
      position: "single",
      continuesNextInRow: false,
      highlight: "none",
      isHovered: false,
    },
  },
);

/**
 * Pasek narzędzi szybkiego głosowania pojawiający się na hover
 */
export const slotQuickVoteToolbarStyles = {
  container:
    "absolute left-1/2 -translate-x-1/2 top-full pt-1 z-[100] hidden group-hover/slotSegment:flex items-center pointer-events-auto",
  card:
    "flex items-center gap-1 p-1 rounded-full bg-popover/95 backdrop-blur-xl border border-border/80 shadow-2xl animate-in fade-in zoom-in-95 duration-100",
};

/**
 * Kontenery odznak podsumowania głosów (Mobile vs Desktop)
 */
export const slotVoteBadgeContainerVariants = cva("items-center shrink-0", {
  variants: {
    breakpoint: {
      // Mobile / tablet: ponizej 1284px
      mobile: "flex min-[1284px]:hidden",
      // Desktop: od 1284px w gore
      desktop: "hidden min-[1284px]:flex",
    },
    continuesNextInRow: {
      true: "ml-auto mr-1.5",
      false: "ml-auto",
    },
  },
  defaultVariants: {
    breakpoint: "desktop",
    continuesNextInRow: false,
  },
});

export const slotStyles = {
  contentRow: "flex items-center justify-between w-full min-w-0 max-w-full h-full gap-1 overflow-hidden",
  emptySlot: cn(
    "@container box-border flex items-center select-none truncate cursor-pointer overflow-hidden transition-all duration-150",
  ),
  simpleBadgeMobile:
    "shrink-0 px-1 py-0 md:py-0.5 rounded bg-black/45 md:bg-black/35 text-[9.5px] md:text-[10px] font-bold text-emerald-300 flex items-center gap-0.5 md:gap-1 leading-none tabular-nums max-h-full",
  desktopBadgeCard:
    "shrink-0 px-1 py-0.5 rounded bg-black/35 text-[10px] font-bold text-white/90 flex items-center gap-1 tabular-nums",
  desktopCompact: "flex @[120px]:hidden items-center",
  desktopFull: "hidden @[120px]:flex items-center gap-1.5",
};

/**
 * Warianty dla przycisków paska szybkiego głosowania (Hover toolbar)
 */
export const slotQuickVoteButtonVariants = cva(
  "w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold select-none transition-all duration-150 cursor-pointer shrink-0 p-0 border",
  {
    variants: {
      vote: {
        yes: "",
        maybe: "",
        no: "",
      },
      active: {
        true: "text-white shadow-sm scale-105",
        false: "hover:scale-105",
      },
    },
    compoundVariants: [
      {
        vote: "yes",
        active: true,
        class: "bg-vote-yes hover:bg-vote-yes-hover border-vote-yes-border/60",
      },
      {
        vote: "yes",
        active: false,
        class:
          "bg-vote-yes-tint text-vote-yes-text hover:bg-vote-yes/30 border-vote-yes-border/20 hover:border-vote-yes-border/50",
      },
      {
        vote: "maybe",
        active: true,
        class: "bg-vote-maybe hover:bg-vote-maybe-hover border-vote-maybe-border/60",
      },
      {
        vote: "maybe",
        active: false,
        class:
          "bg-vote-maybe-tint text-vote-maybe-text hover:bg-vote-maybe/30 border-vote-maybe-border/20 hover:border-vote-maybe-border/50",
      },
      {
        vote: "no",
        active: true,
        class: "bg-vote-no hover:bg-vote-no-hover border-vote-no-border/60",
      },
      {
        vote: "no",
        active: false,
        class:
          "bg-vote-no-tint text-vote-no-text hover:bg-vote-no/30 border-vote-no-border/20 hover:border-vote-no-border/50",
      },
    ],
    defaultVariants: {
      vote: "yes",
      active: false,
    },
  },
);

/**
 * Warianty dla miniaturowej odznaki aktywnego głosu użytkownika w slocie
 */
export const slotActiveVoteBadgeVariants = cva(
  "w-[12px] h-[12px] md:w-[20px] md:h-[20px] rounded-full text-[8px] md:text-[11px] p-0 shadow-sm flex items-center justify-center font-bold select-none shrink-0 border",
  {
    variants: {
      vote: {
        yes: "bg-vote-yes text-white border-vote-yes-border/60",
        maybe: "bg-vote-maybe text-white border-vote-maybe-border/60",
        no: "bg-vote-no text-white border-vote-no-border/60",
      },
    },
    defaultVariants: {
      vote: "yes",
    },
  },
);


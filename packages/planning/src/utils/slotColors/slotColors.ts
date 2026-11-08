/**
 * Event slot colours. Firestore stores only the key (e.g. "blue"); the colour itself is the
 * `--event-<key>` token in `ui-components/src/theme/theme.css`, which holds one value for the
 * light and one for the dark theme, so slots follow the theme switch without re-rendering.
 */
export type SlotColorKey =
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "fuchsia"
  | "pink"
  | "cyan"
  | "sky"
  | "teal"
  | "slate";

export const SLOT_COLOR_KEYS: [SlotColorKey, ...SlotColorKey[]] = [
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "cyan",
  "sky",
  "teal",
  "slate",
];

export const DEFAULT_SLOT_COLOR: SlotColorKey = "blue";

export const isSlotColorKey = (value: string): value is SlotColorKey => SLOT_COLOR_KEYS.some((key) => key === value);

/** CSS colour for a stored slot colour key; unknown or missing keys fall back to the default. */
export const getSlotColorValue = (key?: string): string =>
  `var(--event-${key && isSlotColorKey(key) ? key : DEFAULT_SLOT_COLOR})`;

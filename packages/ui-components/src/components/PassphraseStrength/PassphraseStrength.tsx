import * as React from "react";
import { cn } from "@flaner/shared/utils";
import {
  passphraseStrengthSegmentVariants,
  passphraseStrengthStyles as styles,
  type PassphraseStrengthTone,
} from "./PassphraseStrength.styles";

export type PassphraseStrengthLevel = 0 | 1 | 2 | 3 | 4;

export type PassphraseStrengthProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** 0 = too short / empty, 1 = weak … 4 = very strong; computed by the caller. */
  strength: PassphraseStrengthLevel;
  /** Text describing the level (e.g. "Strong"), also the meter's accessible name. */
  label: string;
};

const SEGMENTS = [1, 2, 3, 4] as const;

const TONES: Record<PassphraseStrengthLevel, PassphraseStrengthTone> = {
  0: "empty",
  1: "weak",
  2: "fair",
  3: "strong",
  4: "strong",
};

/** Four-segment strength meter for a passphrase. Dumb: the caller computes the level and its label. */
export function PassphraseStrength({ strength, label, className, ...props }: PassphraseStrengthProps) {
  const tone = TONES[strength];

  return (
    <div
      data-slot="passphrase-strength"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={4}
      aria-valuenow={strength}
      aria-valuetext={label}
      className={cn(styles.root, className)}
      {...props}
    >
      <div className={styles.bar}>
        {SEGMENTS.map((segment) => (
          <span
            key={segment}
            data-slot="passphrase-strength-segment"
            data-filled={segment <= strength}
            className={passphraseStrengthSegmentVariants({ tone: segment <= strength ? tone : "empty" })}
          />
        ))}
      </div>
      <span className={styles.label} aria-hidden="true">
        {label}
      </span>
    </div>
  );
}

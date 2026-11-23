import { cn, fromMinorUnits, hasAtMostTwoDecimals, toMinorUnits } from "@flaner/shared/utils";
import { useState, type ComponentProps } from "react";
import { planAmountFieldStyles as styles } from "./PlanAmountField.styles";

export type PlanAmountFieldProps = Omit<ComponentProps<"input">, "value" | "onChange" | "type"> & {
  /** The current amount in minor units; `null`: none. */
  value: number | null;
  /** Called on blur / Enter with a changed amount in minor units, or `null` when the field was cleared. */
  onCommit: (amount: number | null) => void;
  /** Accessible name. */
  label: string;
};

const toDraft = (value: number | null) => (value === null ? "" : String(fromMinorUnits(value)));

/**
 * Inline limit / planned income field: reads as text, saves on blur or Enter, Escape reverts. An empty field removes
 * the amount; anything that is not an amount of at most two decimals (≥ 0) reverts.
 */
export const PlanAmountField = ({ value, onCommit, label, className, ...props }: PlanAmountFieldProps) => {
  const [draft, setDraft] = useState(() => toDraft(value));
  // A saved (or reverted elsewhere) amount replaces the draft
  const [shownValue, setShownValue] = useState(value);
  if (shownValue !== value) {
    setShownValue(value);
    setDraft(toDraft(value));
  }

  const commit = () => {
    const trimmed = draft.trim();
    const amount = Number(trimmed);
    const next = trimmed === "" ? null : Number.isFinite(amount) && amount >= 0 && hasAtMostTwoDecimals(amount) ? toMinorUnits(amount) : undefined;
    if (next === undefined || next === value) {
      setDraft(toDraft(value));
      return;
    }
    onCommit(next);
  };

  return (
    <input
      type="number"
      inputMode="decimal"
      step="0.01"
      min="0"
      placeholder="—"
      aria-label={label}
      className={cn(styles.input, className)}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") setDraft(toDraft(value));
      }}
      {...props}
    />
  );
};

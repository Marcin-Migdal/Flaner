import { cn, fromMinorUnits, hasAtMostTwoDecimals, toMinorUnits } from "@flaner/shared/utils";
import { useState, type ComponentProps } from "react";
import { planAmountFieldStyles as styles } from "./PlanAmountField.styles";

export type PlanAmountFieldProps = Omit<ComponentProps<"input">, "value" | "onChange" | "type"> & {
  /** The current amount in minor units; `null`: none. */
  value: number | null;
  /**
   * Called on blur / Enter with a changed amount in minor units, or `null` when the field was cleared. A rejected
   * save puts the current amount back in the field.
   */
  onCommit: (amount: number | null) => Promise<void>;
  /** Accessible name. */
  label: string;
};

const toDraft = (value: number | null) => (value === null ? "" : String(fromMinorUnits(value)));

/**
 * Inline limit / planned income field: reads as text, saves on blur or Enter, Escape reverts. An empty field removes
 * the amount; anything that is not a positive amount of at most two decimals (as in the Add limit dialog) reverts.
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
    const isAmount = Number.isFinite(amount) && amount > 0 && hasAtMostTwoDecimals(amount);
    const next = trimmed === "" ? null : isAmount ? toMinorUnits(amount) : undefined;
    const revert = () => setDraft(toDraft(value));
    if (next === undefined || next === value) {
      revert();
      return;
    }
    onCommit(next).catch(revert);
  };

  return (
    <input
      type="number"
      inputMode="decimal"
      step="0.01"
      min="0.01"
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

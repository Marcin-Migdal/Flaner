import { cn } from "@flaner/shared/utils";
import type { InputHTMLAttributes, KeyboardEvent } from "react";
import { inlineEditStyles as styles } from "./InlineEdit.styles";

export type InlineEditProps = Pick<InputHTMLAttributes<HTMLInputElement>, "placeholder" | "inputMode" | "className"> & {
  value: string;
  "aria-label": string;
  /** Called on blur / Enter with a changed value; returns whether it was accepted (rejected: the field reverts). */
  onCommit: (value: string) => boolean;
  disabled?: boolean;
};

/** Text that turns into an input on hover / focus; saves on blur or Enter, Escape reverts. */
export const InlineEdit = ({ value, onCommit, disabled, className, ...props }: InlineEditProps) => {
  const revert = (input: HTMLInputElement) => {
    input.value = value;
  };

  const commit = (input: HTMLInputElement) => {
    const next = input.value.trim();
    if (next === value) {
      revert(input);
      return;
    }
    if (!onCommit(next)) revert(input);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      revert(event.currentTarget);
      event.currentTarget.blur();
    }
  };

  return (
    <input
      // A saved value (after refetch) resets the field
      key={value}
      type="text"
      defaultValue={value}
      disabled={disabled}
      autoComplete="off"
      className={cn(styles.input, className)}
      onBlur={(event) => commit(event.currentTarget)}
      onKeyDown={onKeyDown}
      {...props}
    />
  );
};

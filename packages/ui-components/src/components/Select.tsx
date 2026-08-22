import { clsx } from "clsx";
import { useId } from "react";
import ReactSelect, { Props as SelectProps } from "react-select";
import { Field, FieldDescription, FieldError, FieldLabel } from "./ui/field";

export type SelectOption = {
  label: string;
  value: string;
  [key: string]: unknown;
};

export type CustomSelectProps<Option extends SelectOption = SelectOption> = Omit<SelectProps<Option, false>, "size"> & {
  label?: string;
  description?: string;
  error?: string;
  containerClassName?: string;
  labelClassName?: string;
  disabled?: boolean;
  variant?: "default" | "glass";
};

export const Select = <Option extends SelectOption = SelectOption>({
  label,
  description,
  error,
  disabled = false,
  variant = "default",
  containerClassName,
  labelClassName,
  options,
  placeholder,
  value,
  onChange,
  id: customId,
  ...props
}: CustomSelectProps<Option>) => {
  const defaultId = useId();
  const selectId = customId || defaultId;

  const customClassNames = {
    control: ({ isFocused }: { isFocused: boolean }) =>
      variant === "glass"
        ? clsx(
            "rounded-xl border transition-all duration-300 min-h-[36px] md:min-h-[44px] text-xs md:text-sm cursor-pointer backdrop-blur-md shadow-sm",
            error
              ? "border-destructive bg-destructive/10"
              : isFocused
                ? "border-brand/40 bg-white/[0.08] shadow-[0_0_15px_-3px_rgba(255,165,0,0.15)]"
                : "border-white/5 bg-white/[0.04] hover:bg-white/[0.06] hover:border-white/10",
          )
        : clsx(
            "rounded-lg border bg-background transition-all duration-200 min-h-[40px] text-sm cursor-pointer",
            error
              ? "border-destructive focus-visible:ring-destructive"
              : isFocused
                ? "border-ring ring-1 ring-ring"
                : "border-input hover:border-accent",
          ),
    valueContainer: () => (variant === "glass" ? "px-2.5 py-1 md:px-3 md:py-1.5 flex items-center gap-1" : "px-3 py-1.5 flex items-center gap-1"),
    singleValue: () => (variant === "glass" ? "text-foreground font-medium" : "text-foreground"),
    placeholder: () => (variant === "glass" ? "text-muted-foreground/70" : "text-muted-foreground"),
    input: () => "text-foreground m-0 p-0",
    menu: () =>
      variant === "glass"
        ? "rounded-2xl border border-white/10 bg-[#151515]/90 backdrop-blur-xl shadow-2xl mt-2 overflow-hidden z-50 p-1.5 flex flex-col"
        : "rounded-lg border border-border bg-popover shadow-lg mt-1.5 overflow-hidden z-50",
    menuList: () =>
      variant === "glass"
        ? "max-h-60 overflow-y-auto overflow-x-hidden m-scroll w-full flex flex-col gap-0.5"
        : "py-1 max-h-60 overflow-y-auto m-scroll",
    option: ({ isFocused, isSelected }: { isFocused: boolean; isSelected: boolean }) =>
      variant === "glass"
        ? clsx(
            "group px-3 py-2.5 text-sm cursor-pointer transition-colors duration-200 rounded-xl w-full",
            isSelected
              ? "bg-brand/15 text-brand font-bold"
              : isFocused
                ? "bg-white/10 text-foreground"
                : "text-foreground/70 hover:text-foreground hover:bg-white/5",
          )
        : clsx(
            "group px-3 py-2 text-sm cursor-pointer transition-colors duration-150",
            isSelected
              ? "bg-brand text-zinc-950 font-semibold"
              : isFocused
                ? "bg-accent text-accent-foreground"
                : "text-foreground/80 hover:text-foreground",
          ),
    indicatorsContainer: () => "px-2 gap-1",
    dropdownIndicator: () => "text-muted-foreground hover:text-foreground",
    clearIndicator: () => "text-muted-foreground hover:text-foreground",
    noOptionsMessage: () => "text-muted-foreground py-3 text-center text-sm",
  };

  return (
    <Field data-invalid={!!error} className={containerClassName}>
      {label && (
        <FieldLabel htmlFor={selectId} className={labelClassName}>
          {label}
        </FieldLabel>
      )}
      <div className="relative w-full">
        <ReactSelect
          id={selectId}
          options={options}
          value={value}
          onChange={onChange}
          isDisabled={disabled}
          placeholder={placeholder}
          unstyled
          classNames={customClassNames}
          {...props}
        />
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
};

Select.displayName = "Select";
export default Select;

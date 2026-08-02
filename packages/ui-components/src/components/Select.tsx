import { clsx } from "clsx";
import { useId } from "react";
import ReactSelect, { Props as SelectProps } from "react-select";
import { Field, FieldDescription, FieldError, FieldLabel } from "./ui/field";

export type SelectOption = {
  label: string;
  value: string;
};

export type CustomSelectProps = Omit<SelectProps<SelectOption, false>, "size"> & {
  label?: string;
  description?: string;
  error?: string;
  containerClassName?: string;
  labelClassName?: string;
  disabled?: boolean;
};

export const Select = ({
  label,
  description,
  error,
  disabled = false,
  containerClassName,
  labelClassName,
  options,
  placeholder,
  value,
  onChange,
  id: customId,
  ...props
}: CustomSelectProps) => {
  const defaultId = useId();
  const selectId = customId || defaultId;

  const customClassNames = {
    control: ({ isFocused }: { isFocused: boolean }) =>
      clsx(
        "rounded-lg border bg-background transition-all duration-200 min-h-[40px] text-sm cursor-pointer",
        error
          ? "border-destructive focus-visible:ring-destructive"
          : isFocused
            ? "border-ring ring-1 ring-ring"
            : "border-input hover:border-accent",
      ),
    valueContainer: () => "px-3 py-1.5 flex items-center gap-1",
    singleValue: () => "text-foreground",
    placeholder: () => "text-muted-foreground",
    input: () => "text-foreground m-0 p-0",
    menu: () => "rounded-lg border border-border bg-popover shadow-lg mt-1.5 overflow-hidden z-50",
    menuList: () => "py-1 max-h-60 overflow-y-auto m-scroll",
    option: ({ isFocused, isSelected }: { isFocused: boolean; isSelected: boolean }) =>
      clsx(
        "px-3 py-2 text-sm cursor-pointer transition-colors duration-150",
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

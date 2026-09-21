import { useId } from "react";
import ReactSelect, { Props as SelectProps, type GroupBase } from "react-select";
import CreatableSelect, { type CreatableProps } from "react-select/creatable";
import { Field, FieldDescription, FieldError, FieldLabel } from "./ui/field";
import { selectControlVariants, selectOptionVariants } from "./Select.styles";
import { cn } from "@flaner/shared/utils";

export type SelectOption = {
  label: string;
  value: string;
  [key: string]: unknown;
};

export type CustomSelectProps<Option extends SelectOption = SelectOption> = Omit<SelectProps<Option, false, GroupBase<Option>>, "size"> &
  Omit<Partial<CreatableProps<Option, false, GroupBase<Option>>>, "size"> & {
    label?: string;
    description?: string;
    error?: string;
    containerClassName?: string;
    labelClassName?: string;
    disabled?: boolean;
    variant?: "default" | "glass";
    creatable?: boolean;
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
  creatable = false,
  ...props
}: CustomSelectProps<Option>) => {
  const defaultId = useId();
  const selectId = customId || defaultId;

  const customClassNames = {
    control: ({ isFocused, isDisabled }: { isFocused: boolean; isDisabled: boolean }) => {
      const isControlDisabled = isDisabled || disabled;
      const state = isControlDisabled ? "disabled" : error ? "error" : isFocused ? "focused" : "idle";
      return selectControlVariants({ variant, state });
    },
    valueContainer: () =>
      variant === "glass"
        ? "px-2.5 py-1 md:px-3 md:py-1.5 flex items-center gap-1"
        : "px-3 py-1.5 flex items-center gap-1",
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
    option: ({ isFocused, isSelected }: { isFocused: boolean; isSelected: boolean }) => {
      const state = isSelected ? "selected" : isFocused ? "focused" : "idle";
      return selectOptionVariants({ variant, state });
    },
    indicatorsContainer: () => "px-2 gap-1",
    dropdownIndicator: () => "text-muted-foreground hover:text-foreground cursor-pointer",
    clearIndicator: () => "text-muted-foreground hover:text-foreground cursor-pointer",
    noOptionsMessage: () => "text-muted-foreground py-3 text-center text-sm",
  };

  return (
    <Field
      data-invalid={!!error}
      data-disabled={disabled}
      className={cn(
        containerClassName,
        "data-[disabled=true]:opacity-60 data-[disabled=true]:cursor-not-allowed",
      )}
    >
      {label && <FieldLabel htmlFor={selectId} className={labelClassName}>{label}</FieldLabel>}
      <div className="relative w-full">
        {creatable ? (
          <CreatableSelect
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
        ) : (
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
        )}
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
};

Select.displayName = "Select";
export default Select;

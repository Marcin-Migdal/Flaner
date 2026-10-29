import React, { useId } from "react";
import { format, isSameDay } from "date-fns";
import { pl, enGB } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@flaner/shared/utils";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Field, FieldLabel, FieldDescription, FieldError } from "../ui/field";
import { useUiTranslations } from "../../hooks/useUiTranslations";

export interface DatePickerProps {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  value?: Date;
  onChange?: (date?: Date) => void;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  dateFormat?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  autoCloseOnSelect?: boolean;
  placeholder?: string;
}

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      label,
      description,
      error,
      id: customId,
      className,
      buttonClassName,
      value,
      onChange,
      disabled,
      dateFormat = "PPP",
      open: controlledOpen,
      onOpenChange: controlledOnOpenChange,
      autoCloseOnSelect = true,
      placeholder,
    },
    ref,
  ) => {
    const defaultId = useId();
    const inputId = customId || defaultId;
    const { t, i18n } = useUiTranslations();
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);

    const isControlled = controlledOpen !== undefined;
    const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

    const handleOpenChange = (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      controlledOnOpenChange?.(nextOpen);
    };

    const handleSelect = (date?: Date, triggerDate?: Date) => {
      const clickedDate = date ?? triggerDate;
      if (value && clickedDate && isSameDay(value, clickedDate)) {
        if (autoCloseOnSelect) {
          handleOpenChange(false);
        }
        return;
      }
      onChange?.(date);
      if (autoCloseOnSelect && date) {
        handleOpenChange(false);
      }
    };

    const dfLocale = i18n.language?.startsWith("pl") ? pl : enGB;

    return (
      <Field data-invalid={!!error} className={className}>
        {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
        
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              id={inputId}
              ref={ref}
              type="button"
              variant="outline"
              size="xl"
              data-invalid={!!error}
              aria-invalid={!!error}
              className={cn(
                "h-10 w-full justify-start rounded-lg border-input bg-transparent px-3 py-2 text-sm font-normal text-foreground shadow-none transition-colors hover:border-accent hover:bg-accent/10 dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
                !value && "text-muted-foreground",
                buttonClassName
              )}
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              {value ? format(value, dateFormat, { locale: dfLocale }) : <span>{placeholder ?? t("datePicker.selectDate")}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              required
              selected={value}
              onSelect={handleSelect}
              locale={dfLocale}
            />
          </PopoverContent>
        </Popover>
        
        {description && <FieldDescription>{description}</FieldDescription>}
        {error && <FieldError>{error}</FieldError>}
      </Field>
    );
  }
);

DatePicker.displayName = "DatePicker";
export default DatePicker;

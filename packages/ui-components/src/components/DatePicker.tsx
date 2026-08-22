import React, { useId } from "react";
import { format } from "date-fns";
import { pl, enUS } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@flaner/shared/utils";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Field, FieldLabel, FieldDescription, FieldError } from "./ui/field";
import { useUiTranslations } from "../hooks/useUiTranslations";

export interface DatePickerProps {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  value?: Date;
  onChange?: (date?: Date) => void;
  className?: string;
  disabled?: boolean;
}

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  ({ label, description, error, id: customId, className, value, onChange, disabled }, ref) => {
    const defaultId = useId();
    const inputId = customId || defaultId;
    const { t, i18n } = useUiTranslations();

    const dfLocale = i18n.language?.startsWith("pl") ? pl : enUS;

    return (
      <Field data-invalid={!!error} className={className}>
        {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id={inputId}
              ref={ref}
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !value && "text-muted-foreground"
              )}
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(value, "PPP", { locale: dfLocale }) : <span>{t("datePicker.selectDate")}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              onSelect={onChange}
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

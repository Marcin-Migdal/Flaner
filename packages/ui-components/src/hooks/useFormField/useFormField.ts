import { useController, type FieldPath, type FieldValues, type UseControllerProps } from "react-hook-form";

/** Props a FormX wrapper takes over from its base input; the form owns them. */
type BoundProps = "name" | "value" | "defaultValue" | "onChange" | "onBlur";

/** Public props of a FormX wrapper: the base input's props (minus the bound ones) plus the react-hook-form controller props. */
export type FormFieldProps<
  TBaseProps,
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TOmit extends PropertyKey = never,
> = Omit<TBaseProps, BoundProps | TOmit> & UseControllerProps<TFieldValues, TName>;

/** Value of a numeric text input as the form stores it: an empty field is `undefined`, anything else a number. */
// An empty number input is null, not undefined: for undefined react-hook-form's useController shows the
// default value again (#106)
export const toNumberOrNull = (value: string): number | null => (value === "" ? null : Number(value));

/**
 * The one react-hook-form binding behind every FormX wrapper. Splits the controller props off,
 * registers the field and maps its error to a message; `rest` is what goes to the base input.
 */
export function useFormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TBaseProps extends object,
>(props: TBaseProps & UseControllerProps<TFieldValues, TName>) {
  const { name, rules, shouldUnregister, defaultValue, control, disabled, exact, ...rest } = props;
  const { field, fieldState } = useController<TFieldValues, TName>({
    name,
    rules,
    shouldUnregister,
    defaultValue,
    control,
    disabled,
    exact,
  });

  return { field, error: fieldState.error?.message, rest };
}

export default useFormField;

import { DropdownStringOption } from "@marcin-migdal/m-component-library";
import { KeysWithStringValue, objToDropdownOption } from "./objToDropdownOption";

export const arrToDropdownOptions = <
  TObj extends Record<string, string | string[] | boolean | undefined | null | number | number>
>(
  arr: TObj[] | undefined,
  labelField: keyof KeysWithStringValue<TObj>,
  valueField: keyof KeysWithStringValue<TObj>
): DropdownStringOption[] => {
  if (!arr) {
    return [];
  }

  return arr.map((obj) => objToDropdownOption(obj, labelField, valueField));
};

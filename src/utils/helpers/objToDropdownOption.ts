import { DropdownStringOption } from "@marcin-migdal/m-component-library/build/components/Inputs/Dropdown/types";

export type KeysWithStringValue<TObj> = { [K in keyof TObj as TObj[K] extends string ? K : never]: TObj[K] };

export const objToDropdownOption = <
  TObj extends Record<string, string | string[] | boolean | undefined | null | number | number>
>(
  obj: TObj,
  labelField: keyof KeysWithStringValue<TObj>,
  valueField: keyof KeysWithStringValue<TObj>
): DropdownStringOption => {
  return {
    label: obj[labelField] as string,
    value: obj[valueField] as string,
  };
};

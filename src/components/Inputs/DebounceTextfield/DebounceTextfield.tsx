import { ChangeEvent, useEffect, useState } from "react";

import { useDebounce } from "@hooks";

import { Textfield, TextfieldProps } from "@marcin-migdal/m-component-library";

type DebounceTextfieldPropsType = Omit<TextfieldProps, "value" | "onChange"> & {
  defaultValue?: string;
  onDebounce: (event: { target: { name: string; value: string } }) => void;
} & (
    | { value?: undefined; onChange?: undefined }
    | { value?: string; onChange: (event: ChangeEvent<HTMLInputElement>, value: string) => void }
  );

const FILTER_DELAY = 300;
export const DebounceTextfield = ({
  name,
  defaultValue = "",
  value: externalValue,
  onChange,
  onDebounce,
  ...otherProps
}: DebounceTextfieldPropsType) => {
  const isControlled = typeof externalValue === "string" ? true : false;

  const [hasValueChanged, setHasValueChanged] = useState(false);
  const [internalValue, setInternalValue] = useState<string>(defaultValue);

  const value = isControlled ? externalValue : internalValue;

  const debounceValue = useDebounce(value, FILTER_DELAY);

  useEffect(() => {
    const handleDebounce = () => {
      onDebounce({ target: { value: debounceValue, name: name || "debounceTextfield" } });
    };

    hasValueChanged && handleDebounce();
  }, [debounceValue]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    !hasValueChanged && setHasValueChanged(true);

    if (onChange) {
      onChange(event, event.target.value);
    }

    !isControlled && setInternalValue(event.target.value);
  };

  return <Textfield {...otherProps} name={name} value={value} onChange={handleChange} />;
};

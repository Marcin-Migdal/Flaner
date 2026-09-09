import { useCallback, useMemo, useState } from "react";
import type { FilamentTemplate } from "../../../../api/templates";
import { CUSTOM_COLOR_HEX_STORAGE_KEY, HEX_COLOR_REGEX } from "../TemplateFormModal.constants";

export const getStoredCustomColorHexes = (): Record<string, string> => {
  try {
    const item = localStorage.getItem(CUSTOM_COLOR_HEX_STORAGE_KEY);
    if (item) {
      return JSON.parse(item) as Record<string, string>;
    }
  } catch {
    // Ignore storage parse error
  }
  return {};
};

export const storeCustomColorHex = (colorName: string, hex: string) => {
  try {
    const existing = getStoredCustomColorHexes();
    existing[colorName.trim().toLowerCase()] = hex;
    localStorage.setItem(CUSTOM_COLOR_HEX_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // Ignore storage write error
  }
};

type UseTemplateCustomColorsProps = {
  userTemplates: FilamentTemplate[];
  lookupColors: Array<{ name?: string; hex?: string }>;
  isCustomColor: boolean;
  watchColorName?: string;
  watchMaterial?: string;
  watchType?: string;
  onColorHexChange: (hex: string) => void;
  onSaveLookupColor?: (data: {
    materialName: string;
    typeName: string;
    name: string;
    hex: string;
  }) => void;
};

export const useTemplateCustomColors = ({
  userTemplates,
  lookupColors,
  isCustomColor,
  watchColorName,
  watchMaterial,
  watchType,
  onColorHexChange,
  onSaveLookupColor,
}: UseTemplateCustomColorsProps) => {
  const [localCustomHexMap, setLocalCustomHexMap] = useState<Record<string, string>>(() =>
    getStoredCustomColorHexes(),
  );

  // Derive full customHexMap by merging local state with userTemplates and lookupColors
  const customHexMap = useMemo(() => {
    const map = { ...localCustomHexMap };

    for (const tpl of userTemplates) {
      if (tpl.colorName && tpl.colorHex) {
        const key = tpl.colorName.trim().toLowerCase();
        if (!map[key]) {
          map[key] = tpl.colorHex;
        }
      }
    }

    for (const lc of lookupColors) {
      if (lc.name && lc.hex) {
        const key = lc.name.trim().toLowerCase();
        if (!map[key]) {
          map[key] = lc.hex;
        }
      }
    }

    return map;
  }, [localCustomHexMap, userTemplates, lookupColors]);

  const saveCustomColorHex = useCallback(
    (newHex: string) => {
      const rawVal = newHex.trim();
      if (!rawVal) return;

      const formattedVal = rawVal.startsWith("#") ? rawVal : `#${rawVal}`;

      if (HEX_COLOR_REGEX.test(formattedVal)) {
        onColorHexChange(formattedVal);
        if (isCustomColor && watchColorName && watchMaterial && watchType) {
          const lower = watchColorName.trim().toLowerCase();
          storeCustomColorHex(lower, formattedVal);
          setLocalCustomHexMap((prev) => ({ ...prev, [lower]: formattedVal }));

          if (onSaveLookupColor) {
            onSaveLookupColor({
              materialName: watchMaterial,
              typeName: watchType,
              name: watchColorName,
              hex: formattedVal,
            });
          }
        }
      }
    },
    [
      isCustomColor,
      watchColorName,
      watchMaterial,
      watchType,
      onColorHexChange,
      onSaveLookupColor,
    ],
  );

  return {
    customHexMap,
    saveCustomColorHex,
  };
};

export default useTemplateCustomColors;

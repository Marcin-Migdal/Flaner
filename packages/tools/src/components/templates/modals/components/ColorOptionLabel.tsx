import React from "react";
import type { SelectOption } from "@flaner/ui-components";
import { useToolsTranslations } from "../../../../hooks";
import { TemplateOptionLabel } from "./TemplateOptionLabel";

export type ColorOptionLabelProps = {
  option: SelectOption;
  meta: { context: "menu" | "value" };
  activeColorName?: string;
  activeColorHex?: string;
  onDelete?: (id: string, name: string) => void;
};

export const ColorOptionLabel: React.FC<ColorOptionLabelProps> = ({
  option,
  meta,
  activeColorName,
  activeColorHex,
  onDelete,
}) => {
  const { t } = useToolsTranslations();
  const optionId = typeof option.id === "string" ? option.id : undefined;
  const hex = typeof option.hex === "string" ? option.hex : undefined;
  const displayHex = hex || (option.label === activeColorName ? activeColorHex : undefined);

  return (
    <TemplateOptionLabel
      option={option}
      meta={meta}
      customLabel={t("spooler.common.custom")}
      displayHex={displayHex}
      deleteTooltip={t("spooler.templates.deleteColorTooltip")}
      onDelete={
        optionId && onDelete ? () => onDelete(optionId, option.value) : undefined
      }
    />
  );
};

export default ColorOptionLabel;

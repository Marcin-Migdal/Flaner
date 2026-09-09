import React from "react";
import type { SelectOption } from "@flaner/ui-components";
import { useToolsTranslations } from "../../../../hooks";
import { TemplateOptionLabel } from "./TemplateOptionLabel";

export type MaterialOptionLabelProps = {
  option: SelectOption;
  meta: { context: "menu" | "value" };
  onDelete?: (id: string, name: string) => void;
};

export const MaterialOptionLabel: React.FC<MaterialOptionLabelProps> = ({
  option,
  meta,
  onDelete,
}) => {
  const { t } = useToolsTranslations();
  const optionId = typeof option.id === "string" ? option.id : undefined;

  return (
    <TemplateOptionLabel
      option={option}
      meta={meta}
      customLabel={t("spooler.common.custom")}
      deleteTooltip={t("spooler.templates.deleteMaterialTooltip")}
      onDelete={
        optionId && onDelete ? () => onDelete(optionId, option.value) : undefined
      }
    />
  );
};

export default MaterialOptionLabel;

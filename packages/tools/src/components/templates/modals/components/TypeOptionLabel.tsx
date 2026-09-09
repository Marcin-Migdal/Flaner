import React from "react";
import type { SelectOption } from "@flaner/ui-components";
import { useToolsTranslations } from "../../../../hooks";
import { TemplateOptionLabel } from "./TemplateOptionLabel";

export type TypeOptionLabelProps = {
  option: SelectOption;
  meta: { context: "menu" | "value" };
  materialName?: string;
  onDelete?: (id: string, materialName: string, name: string) => void;
};

export const TypeOptionLabel: React.FC<TypeOptionLabelProps> = ({
  option,
  meta,
  materialName,
  onDelete,
}) => {
  const { t } = useToolsTranslations();
  const optionId = typeof option.id === "string" ? option.id : undefined;
  const resolvedMaterialName =
    typeof option.materialName === "string" ? option.materialName : materialName || "";

  return (
    <TemplateOptionLabel
      option={option}
      meta={meta}
      customLabel={t("spooler.common.custom")}
      deleteTooltip={t("spooler.templates.deleteTypeTooltip")}
      onDelete={
        optionId && onDelete
          ? () => onDelete(optionId, resolvedMaterialName, option.value)
          : undefined
      }
    />
  );
};

export default TypeOptionLabel;

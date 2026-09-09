import React, { useMemo } from "react";
import { Edit2, MoreVertical, Trash2 } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@flaner/ui-components";
import type { FilamentTemplate } from "../../api/templates";
import { useToolsTranslations } from "../../hooks";
import { bambuFilaments } from "../../utils/bambuFilaments";

type TemplateItemProps = {
  template: FilamentTemplate;
  onEdit: () => void;
  onDelete: () => void;
};

export const TemplateItem: React.FC<TemplateItemProps> = ({
  template,
  onEdit,
  onDelete,
}) => {
  const { t } = useToolsTranslations();

  const displayHex = useMemo(() => {
    if (template.colorHex && template.colorHex.toLowerCase() !== "#ffffff") {
      return template.colorHex;
    }
    const mat = bambuFilaments.find(
      (m) => m.name.toLowerCase() === template.material?.toLowerCase(),
    );
    const typ = mat?.types.find(
      (t) => t.name.toLowerCase() === template.type?.toLowerCase(),
    );
    const col = typ?.colors.find(
      (c) => c.name.toLowerCase() === template.colorName?.toLowerCase(),
    );
    return col?.hex || template.colorHex || "#ffffff";
  }, [template.colorHex, template.material, template.type, template.colorName]);

  return (
    <div
      className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between hover:border-brand/40 transition-all shadow-sm relative"
      style={{ boxShadow: `inset 5px 0 0 0 ${displayHex}99` }}
    >
      <div className="flex items-center gap-4 pl-1 min-w-0">
        <div
          className="size-8 rounded-full border border-border/60 shadow-xs flex-shrink-0"
          style={{ backgroundColor: displayHex }}
          title={template.colorName}
        />

        <div className="text-left min-w-0">
          <h3 className="font-bold text-foreground text-base truncate flex items-center gap-2">
            {template.material} {template.type}
          </h3>
          <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">
            {template.colorName} • {template.defaultWeight}g
          </p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="size-8 p-0">
            <MoreVertical className="size-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={onEdit}>
            <Edit2 className="size-4 mr-2" />
            <span>{t("spooler.templates.editTemplate")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="size-4 mr-2" />
            <span>{t("spooler.templates.deleteTemplate")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default TemplateItem;

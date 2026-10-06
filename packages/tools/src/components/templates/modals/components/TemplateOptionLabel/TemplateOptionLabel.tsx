import React from "react";
import { Trash2 } from "lucide-react";
import type { SelectOption } from "@flaner/ui-components";

export type TemplateOptionLabelProps = {
  option: SelectOption;
  meta: { context: "menu" | "value" };
  customLabel: string;
  displayHex?: string;
  deleteTooltip?: string;
  onDelete?: () => void;
};

export const TemplateOptionLabel: React.FC<TemplateOptionLabelProps> = ({
  option,
  meta,
  customLabel,
  displayHex,
  deleteTooltip,
  onDelete,
}) => {
  const isCustom = Boolean(option.isCustom);
  const optionId = typeof option.id === "string" ? option.id : undefined;

  return (
    <div className="flex items-center justify-between gap-2 w-full">
      <div className="flex items-center gap-2 min-w-0">
        {displayHex && (
          <div
            className="size-3.5 rounded-full border border-border/60 shrink-0 shadow-xs"
            style={{ backgroundColor: displayHex }}
          />
        )}
        <span className="text-sm truncate">{option.label}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {isCustom && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand/10 text-brand border border-brand/20 font-medium shrink-0">
            {customLabel}
          </span>
        )}
        {meta.context === "menu" && isCustom && optionId && onDelete && (
          <button
            type="button"
            title={deleteTooltip}
            aria-label={deleteTooltip}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 flex items-center justify-center size-6 rounded-md bg-zinc-950 text-vote-no hover:bg-vote-no hover:text-zinc-950 border border-white/20 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default TemplateOptionLabel;

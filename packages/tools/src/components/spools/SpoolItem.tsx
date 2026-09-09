import React, { useMemo } from "react";
import { CheckCircle2, Edit2, History, MoreVertical, Printer, RotateCcw, Trash2 } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@flaner/ui-components";
import type { FilamentSpool } from "../../api/spools";
import { useToolsTranslations } from "../../hooks/useToolsTranslations";
import { bambuFilaments } from "../../utils/bambuFilaments";

type SpoolItemProps = {
  spool: FilamentSpool;
  onRecordPrint: () => void;
  onEdit: () => void;
  onMarkFinished: () => void;
  onDelete: () => void;
  onViewHistory: () => void;
  onUndoLastPrint: () => void;
};

export const SpoolItem: React.FC<SpoolItemProps> = ({
  spool,
  onRecordPrint,
  onEdit,
  onMarkFinished,
  onDelete,
  onViewHistory,
  onUndoLastPrint,
}) => {
  const { t } = useToolsTranslations();
  const percentage = Math.max(0, Math.min(100, (spool.currentWeight / spool.initialWeight) * 100));

  const displayHex = useMemo(() => {
    if (spool.colorHex && spool.colorHex.toLowerCase() !== "#ffffff") {
      return spool.colorHex;
    }
    const mat = bambuFilaments.find(
      (m) => m.name.toLowerCase() === spool.material?.toLowerCase(),
    );
    const typ = mat?.types.find(
      (t) => t.name.toLowerCase() === spool.type?.toLowerCase(),
    );
    const col = typ?.colors.find(
      (c) => c.name.toLowerCase() === spool.colorName?.toLowerCase(),
    );
    return col?.hex || spool.colorHex || "#ffffff";
  }, [spool.colorHex, spool.material, spool.type, spool.colorName]);

  return (
    <div
      className="bg-card border border-border rounded-2xl p-5 hover:border-brand/40 transition-all shadow-sm relative flex flex-col justify-between min-h-[160px]"
      style={{ boxShadow: `inset 5px 0 0 0 ${displayHex}99` }}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between pl-1 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {/* Color Circle */}
          <div
            className="size-7 rounded-full border border-border/60 flex-shrink-0 shadow-xs"
            style={{ backgroundColor: displayHex }}
          />
          <div className="text-left min-w-0">
            <h3 className="font-bold text-foreground leading-tight truncate text-base" title={spool.name}>
              {spool.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 font-medium truncate">
              {spool.material} {spool.type} • {spool.colorName}
            </p>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            onClick={onRecordPrint}
            className="h-8 px-3 text-xs font-semibold flex items-center gap-1.5"
            title={t("spooler.spools.recordUsage")}
          >
            <Printer className="size-3.5" />
            <span>{t("spooler.spools.recordPrint")}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onUndoLastPrint}
            className="size-8 p-0"
            title={t("spooler.spools.undoLastPrint")}
          >
            <RotateCcw className="size-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="size-8 p-0">
                <MoreVertical className="size-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onViewHistory}>
                <History className="size-4 mr-2" />
                <span>{t("spooler.spools.printHistory")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="size-4 mr-2" />
                <span>{t("spooler.spools.editSpool")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMarkFinished}>
                <CheckCircle2 className="size-4 mr-2 text-emerald-500" />
                <span>{t("spooler.spools.markFinished")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="size-4 mr-2" />
                <span>{t("spooler.spools.deleteSpool")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Progress and Weight statistics */}
      <div className="mt-5 pl-1 space-y-2">
        <div className="flex justify-between items-end text-xs text-muted-foreground">
          <span>{t("spooler.spools.remainingWeight")}:</span>
          <span className="font-bold text-sm text-foreground">
            {spool.currentWeight}g{" "}
            <span className="text-[11px] text-muted-foreground font-normal">/ {spool.initialWeight}g</span>
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden border border-border/40">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${percentage}%`,
              backgroundColor: spool.colorHex,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SpoolItem;

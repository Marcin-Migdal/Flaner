import React from "react";
import { History, Plus, Trash2 } from "lucide-react";
import { Button } from "@flaner/ui-components";
import type { FilamentSpool } from "../../api/spools";
import { useToolsTranslations } from "../../hooks/useToolsTranslations";

type FinishedSpoolItemProps = {
  spool: FilamentSpool;
  onClone: () => void;
  onDelete: () => void;
  onViewHistory: () => void;
};

export const FinishedSpoolItem: React.FC<FinishedSpoolItemProps> = ({
  spool,
  onClone,
  onDelete,
  onViewHistory,
}) => {
  const { t } = useToolsTranslations();

  return (
    <div className="bg-card/40 border border-border/60 rounded-xl p-4 flex items-center justify-between gap-2 text-left relative overflow-hidden transition-all hover:bg-card/70">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="size-5 rounded-full border border-border/40 flex-shrink-0 shadow-xs opacity-80"
          style={{ backgroundColor: spool.colorHex }}
        />
        <div className="min-w-0">
          <h4 className="font-semibold text-muted-foreground text-sm line-through truncate" title={spool.name}>
            {spool.name}
          </h4>
          <p className="text-[11px] text-muted-foreground/70 truncate">
            {spool.material} {spool.type} • {t("spooler.spools.empty")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          onClick={onViewHistory}
          title={t("spooler.spools.printHistory")}
          className="size-8 p-0"
        >
          <History className="size-3.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onClone}
          title={t("spooler.spools.addSpool")}
          className="h-8 px-2 text-xs flex items-center gap-1"
        >
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">{t("spooler.spools.clone")}</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          title={t("spooler.spools.deleteSpool")}
          className="size-8 p-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default FinishedSpoolItem;

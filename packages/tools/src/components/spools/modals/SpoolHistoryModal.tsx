import React, { useState } from "react";
import { Archive, Calendar, Loader2, Scale, Trash2 } from "lucide-react";
import {
  Button,
  ConfirmationPopup,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@flaner/ui-components";
import type { FilamentSpool } from "../../../api/spools";
import {
  useGetSpoolPrintsQuery,
  useUndoLastPrintMutation,
  useToolsTranslations,
} from "../../../hooks";

type SpoolHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  spool: FilamentSpool;
};

export const SpoolHistoryModal: React.FC<SpoolHistoryModalProps> = ({
  isOpen,
  onClose,
  spool,
}) => {
  const { t, i18n } = useToolsTranslations();
  const [confirmUndoPrint, setConfirmUndoPrint] = useState<{ id: string; usedWeight: number } | null>(null);

  const { data: prints = [], isLoading } = useGetSpoolPrintsQuery(isOpen ? spool.id : undefined);

  const undoPrintMutation = useUndoLastPrintMutation({
    onSuccess: () => {
      setConfirmUndoPrint(null);
    },
  });

  const formatDate = (createdAt?: { seconds?: number } | null) => {
    if (!createdAt || typeof createdAt.seconds !== "number") {
      return { dateStr: "-", timeStr: "" };
    }
    const date = new Date(createdAt.seconds * 1000);
    const locale = i18n.language === "pl" ? "pl-PL" : "en-US";
    return {
      dateStr: date.toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      timeStr: date.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const handleConfirmUndo = () => {
    if (confirmUndoPrint) {
      undoPrintMutation.mutate({
        spoolId: spool.id,
        printId: confirmUndoPrint.id,
        usedWeight: confirmUndoPrint.usedWeight,
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("spooler.spools.printHistory")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Header / Spool overview */}
            <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between text-left shadow-xs">
              <div className="flex items-center gap-3">
                <div
                  className="size-7 rounded-full border border-border/60 flex-shrink-0 shadow-xs"
                  style={{ backgroundColor: spool.colorHex }}
                />
                <div>
                  <h4 className="font-bold text-foreground text-sm truncate max-w-[200px]" title={spool.name}>
                    {spool.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {spool.material} {spool.type} • {spool.colorName}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground block">{t("spooler.spools.remainingWeight")}:</span>
                <span className="font-bold text-sm text-foreground">{spool.currentWeight}g</span>
              </div>
            </div>

            {/* Prints List */}
            <div>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Loader2 className="size-6 text-brand animate-spin" />
                  <p className="text-xs text-muted-foreground">Ładowanie historii...</p>
                </div>
              ) : prints.length === 0 ? (
                <div className="bg-card/40 border border-dashed border-border rounded-xl py-10 px-4 text-center">
                  <Archive className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground text-xs">{t("spooler.spools.noHistory")}</p>
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden divide-y divide-border bg-card/20">
                  <div className="grid grid-cols-2 px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 text-left">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      {t("spooler.spools.date")}
                    </span>
                    <span className="flex items-center gap-1.5 justify-end">
                      <Scale className="size-3.5" />
                      {t("spooler.spools.usedFilament")}
                    </span>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
                    {prints.map((print) => {
                      const formatted = formatDate(print.createdAt);
                      return (
                        <div
                          key={print.id}
                          className="grid grid-cols-2 px-4 py-3 text-sm hover:bg-muted/20 transition-all text-left"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground text-xs">{formatted.dateStr}</span>
                            <span className="text-[10px] text-muted-foreground">{formatted.timeStr}</span>
                          </div>
                          <div className="flex items-center justify-end font-semibold text-brand gap-2">
                            <span>-{print.usedWeight}g</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmUndoPrint({ id: print.id, usedWeight: print.usedWeight })}
                              disabled={undoPrintMutation.isPending}
                              className="size-7 p-0 text-muted-foreground hover:text-destructive"
                              title={t("spooler.spools.undoLastPrint")}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t("spooler.common.close")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationPopup
        open={!!confirmUndoPrint}
        onOpenChange={(open) => !open && setConfirmUndoPrint(null)}
        onConfirm={handleConfirmUndo}
        title={t("spooler.spools.undoConfirmTitle")}
        description={
          confirmUndoPrint
            ? t("spooler.spools.undoConfirmMessage", { weight: confirmUndoPrint.usedWeight })
            : ""
        }
        confirmLabel={t("spooler.spools.undoLastPrint")}
        cancelLabel={t("spooler.common.cancel")}
        variant="destructive"
        isConfirming={undoPrintMutation.isPending}
      />
    </>
  );
};

export default SpoolHistoryModal;

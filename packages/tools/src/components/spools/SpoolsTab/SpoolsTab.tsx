import React, { useState } from "react";
import { Archive, Ban, Loader2, Plus, ShoppingBag } from "lucide-react";
import { Button, ConfirmationPopup } from "@flaner/ui-components";
import type { FilamentSpool, RecordUsageResult, SpoolInput } from "../../../api/spools";
import type { FilamentTemplate } from "../../../api/templates";
import {
  useGetSpoolsQuery,
  useMarkSpoolAsFinishedMutation,
  useUndoLastPrintMutation,
  useDeleteSpoolMutation,
  useToolsTranslations,
} from "../../../hooks";
import { nextSpoolPrefill } from "../../../utils/spoolLifecycle";
import { SpoolItem } from "../SpoolItem";
import { FinishedSpoolItem } from "../FinishedSpoolItem";
import { SpoolFormModal } from "../modals/SpoolFormModal";
import { QuickUsageModal } from "../modals/QuickUsageModal";
import { SpoolHistoryModal } from "../modals/SpoolHistoryModal";
import { CloneSpoolPromptModal } from "../modals/CloneSpoolPromptModal";

type SpoolForm = { mode: "add" } | { mode: "edit"; spool: FilamentSpool } | { mode: "clone"; prefill: SpoolInput };

type SpoolsTabProps = {
  templates: FilamentTemplate[];
  onNavigateToTemplates: () => void;
};

export const SpoolsTab: React.FC<SpoolsTabProps> = ({
  templates,
  onNavigateToTemplates,
}) => {
  const { t } = useToolsTranslations();

  const [spoolForm, setSpoolForm] = useState<SpoolForm | null>(null);
  const [deletingSpool, setDeletingSpool] = useState<FilamentSpool | null>(null);

  // Quick Usage States
  const [usageSpool, setUsageSpool] = useState<FilamentSpool | null>(null);

  // History Modal State
  // By id, so the open modal shows the live spool (e.g. its weight after an undo)
  const [historySpoolId, setHistorySpoolId] = useState<string | null>(null);

  // Undo Last Print Confirm State
  const [undoLastSpoolConfirm, setUndoLastSpoolConfirm] = useState<FilamentSpool | null>(null);

  // Manual finish confirm State
  const [manualFinishSpool, setManualFinishSpool] = useState<FilamentSpool | null>(null);

  // A print emptied a spool: the transaction result, offered as the next spool
  const [runOut, setRunOut] = useState<RecordUsageResult | null>(null);

  // Fetch Spools
  const { data: spools = [], isLoading } = useGetSpoolsQuery();
  const historySpool = spools.find((spool) => spool.id === historySpoolId);

  // Mutations
  const markAsFinishedMutation = useMarkSpoolAsFinishedMutation({
    onSuccess: () => setManualFinishSpool(null),
  });

  const undoLastPrintMutation = useUndoLastPrintMutation({
    onSuccess: () => setUndoLastSpoolConfirm(null),
  });

  const deleteSpoolMutation = useDeleteSpoolMutation({
    onSuccess: () => setDeletingSpool(null),
  });

  const activeSpools = spools.filter((s) => !s.isFinished);
  const finishedSpools = spools.filter((s) => s.isFinished);

  const openClone = (spool: FilamentSpool, carryover: number) =>
    setSpoolForm({ mode: "clone", prefill: nextSpoolPrefill(spool, carryover) });

  return (
    <div className="w-full space-y-8">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-left">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="size-5 text-brand-text" />
            {t("spooler.spools.activeSpools")} ({activeSpools.length})
          </h2>
        </div>

        {templates.length === 0 ? (
          <div className="text-xs bg-muted/60 border border-border rounded-xl px-4 py-3 text-muted-foreground text-left max-w-sm flex items-center justify-between gap-3">
            <span>{t("spooler.spools.createTemplateFirst")}</span>
            <Button size="sm" variant="outline" onClick={onNavigateToTemplates}>
              {t("spooler.tabs.templates")}
            </Button>
          </div>
        ) : (
          <Button onClick={() => setSpoolForm({ mode: "add" })} className="flex items-center gap-2 self-start sm:self-auto">
            <Plus className="size-4" />
            <span>{t("spooler.spools.addSpool")}</span>
          </Button>
        )}
      </div>

      {/* Active Spools Section */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 text-brand-text animate-spin" />
        </div>
      ) : activeSpools.length === 0 ? (
        <div className="w-full bg-card/40 border border-dashed border-border rounded-2xl py-12 px-4 text-center">
          <Archive className="size-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground text-sm">{t("spooler.spools.noActiveSpools")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeSpools.map((spool) => (
            <SpoolItem
              key={spool.id}
              spool={spool}
              onRecordPrint={() => setUsageSpool(spool)}
              onEdit={() => setSpoolForm({ mode: "edit", spool })}
              onMarkFinished={() => setManualFinishSpool(spool)}
              onDelete={() => setDeletingSpool(spool)}
              onViewHistory={() => setHistorySpoolId(spool.id)}
              onUndoLastPrint={() => setUndoLastSpoolConfirm(spool)}
            />
          ))}
        </div>
      )}

      {/* Empty / Finished Spools Section */}
      <div className="w-full text-left border-t border-border pt-8 space-y-4">
        <h3 className="text-lg font-bold text-muted-foreground flex items-center gap-2">
          <Ban className="size-5" />
          {t("spooler.spools.finishedSpools")} ({finishedSpools.length})
        </h3>

        {finishedSpools.length === 0 ? (
          <p className="text-muted-foreground/60 text-xs italic pl-1">{t("spooler.spools.noFinishedSpools")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-75">
            {finishedSpools.map((spool) => (
              <FinishedSpoolItem
                key={spool.id}
                spool={spool}
                onClone={() => openClone(spool, 0)}
                onDelete={() => setDeletingSpool(spool)}
                onViewHistory={() => setHistorySpoolId(spool.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Spool Form Modal */}
      <SpoolFormModal
        isOpen={!!spoolForm}
        onClose={() => setSpoolForm(null)}
        templates={templates}
        initialData={spoolForm?.mode === "edit" ? spoolForm.spool : null}
        clonePrefill={spoolForm?.mode === "clone" ? spoolForm.prefill : null}
      />

      {/* Quick Usage Modal */}
      {usageSpool && (
        <QuickUsageModal
          isOpen={!!usageSpool}
          onClose={() => setUsageSpool(null)}
          spool={usageSpool}
          onRunOut={setRunOut}
        />
      )}

      {/* Spool History Modal */}
      {historySpool && (
        <SpoolHistoryModal
          isOpen={!!historySpool}
          onClose={() => setHistorySpoolId(null)}
          spool={historySpool}
        />
      )}

      {/* Clone Spool Prompt Modal */}
      <CloneSpoolPromptModal
        isOpen={!!runOut}
        onClose={() => setRunOut(null)}
        onConfirm={() => runOut && openClone(runOut.spool, runOut.carryover)}
      />

      {/* Delete Spool Confirmation */}
      <ConfirmationPopup
        open={!!deletingSpool}
        onOpenChange={(open) => !open && setDeletingSpool(null)}
        onConfirm={() => deletingSpool && deleteSpoolMutation.mutate(deletingSpool.id)}
        title={t("spooler.spools.deletePromptTitle")}
        description={t("spooler.spools.deletePromptBody")}
        confirmLabel={t("spooler.spools.deleteSpool")}
        cancelLabel={t("spooler.common.cancel")}
        variant="destructive"
        isConfirming={deleteSpoolMutation.isPending}
      />

      {/* Undo Last Print Confirmation */}
      <ConfirmationPopup
        open={!!undoLastSpoolConfirm}
        onOpenChange={(open) => !open && setUndoLastSpoolConfirm(null)}
        onConfirm={() =>
          undoLastSpoolConfirm &&
          undoLastPrintMutation.mutate({ spoolId: undoLastSpoolConfirm.id })
        }
        title={t("spooler.spools.undoConfirmTitle")}
        description={t("spooler.spools.undoLastConfirmMessage")}
        confirmLabel={t("spooler.spools.undoLastPrint")}
        cancelLabel={t("spooler.common.cancel")}
        variant="primary"
        isConfirming={undoLastPrintMutation.isPending}
      />

      {/* Manual Finish Confirmation */}
      <ConfirmationPopup
        open={!!manualFinishSpool}
        onOpenChange={(open) => !open && setManualFinishSpool(null)}
        onConfirm={() =>
          manualFinishSpool && markAsFinishedMutation.mutate(manualFinishSpool.id)
        }
        title={t("spooler.spools.markFinishedTitle")}
        description={t("spooler.spools.markFinishedDesc")}
        confirmLabel={t("spooler.spools.markFinished")}
        cancelLabel={t("spooler.common.cancel")}
        variant="primary"
        isConfirming={markAsFinishedMutation.isPending}
      />
    </div>
  );
};

export default SpoolsTab;

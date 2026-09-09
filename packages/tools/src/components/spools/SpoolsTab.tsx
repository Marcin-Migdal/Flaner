import React, { useState } from "react";
import { Archive, Ban, Loader2, Plus, ShoppingBag } from "lucide-react";
import { Button, ConfirmationPopup } from "@flaner/ui-components";
import type { FilamentSpool } from "../../api/spools";
import type { FilamentTemplate } from "../../api/templates";
import {
  useGetSpoolsQuery,
  useMarkSpoolAsFinishedMutation,
  useUndoLastPrintMutation,
  useDeleteSpoolMutation,
  useToolsTranslations,
} from "../../hooks";
import { SpoolItem } from "./SpoolItem";
import { FinishedSpoolItem } from "./FinishedSpoolItem";
import { SpoolFormModal } from "./modals/SpoolFormModal";
import { QuickUsageModal } from "./modals/QuickUsageModal";
import { SpoolHistoryModal } from "./modals/SpoolHistoryModal";
import { CloneSpoolPromptModal } from "./modals/CloneSpoolPromptModal";

type SpoolsTabProps = {
  templates: FilamentTemplate[];
  onNavigateToTemplates: () => void;
};

export const SpoolsTab: React.FC<SpoolsTabProps> = ({
  templates,
  onNavigateToTemplates,
}) => {
  const { t } = useToolsTranslations();

  // Modal / Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCloneMode, setIsCloneMode] = useState(false);
  const [editingSpool, setEditingSpool] = useState<FilamentSpool | null>(null);
  const [deletingSpool, setDeletingSpool] = useState<FilamentSpool | null>(null);

  // Quick Usage States
  const [usageSpool, setUsageSpool] = useState<FilamentSpool | null>(null);

  // History Modal State
  const [historySpool, setHistorySpool] = useState<FilamentSpool | null>(null);

  // Undo Last Print Confirm State
  const [undoLastSpoolConfirm, setUndoLastSpoolConfirm] = useState<FilamentSpool | null>(null);

  // Manual finish confirm State
  const [manualFinishSpool, setManualFinishSpool] = useState<FilamentSpool | null>(null);

  // Clone Trigger States (when spool goes <= 0)
  const [clonePromptSpool, setClonePromptSpool] = useState<FilamentSpool | null>(null);
  const [cloneCarryoverUsage, setCloneCarryoverUsage] = useState<number>(0);
  const [clonePrevCurrentWeight, setClonePrevCurrentWeight] = useState<number>(0);

  // Fetch Spools
  const { data: spools = [], isLoading } = useGetSpoolsQuery();

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

  const handleOpenAdd = () => {
    setEditingSpool(null);
    setIsCloneMode(false);
    setIsFormOpen(true);
  };

  const handleCloneSpool = (spool: FilamentSpool, carryover: number = 0) => {
    setEditingSpool(spool);
    setIsCloneMode(true);
    setCloneCarryoverUsage(carryover);
    setClonePrevCurrentWeight(spool.currentWeight);
    setIsFormOpen(true);
  };

  return (
    <div className="w-full space-y-8">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-left">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="size-5 text-brand" />
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
          <Button onClick={handleOpenAdd} className="flex items-center gap-2 self-start sm:self-auto">
            <Plus className="size-4" />
            <span>{t("spooler.spools.addSpool")}</span>
          </Button>
        )}
      </div>

      {/* Active Spools Section */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 text-brand animate-spin" />
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
              onEdit={() => {
                setEditingSpool(spool);
                setIsCloneMode(false);
                setIsFormOpen(true);
              }}
              onMarkFinished={() => setManualFinishSpool(spool)}
              onDelete={() => setDeletingSpool(spool)}
              onViewHistory={() => setHistorySpool(spool)}
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
                onClone={() => handleCloneSpool(spool)}
                onDelete={() => setDeletingSpool(spool)}
                onViewHistory={() => setHistorySpool(spool)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Spool Form Modal */}
      <SpoolFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setIsCloneMode(false);
          setEditingSpool(null);
        }}
        templates={templates}
        initialData={editingSpool}
        isCloneMode={isCloneMode}
        cloneCarryoverUsage={cloneCarryoverUsage}
        clonePrevCurrentWeight={clonePrevCurrentWeight}
      />

      {/* Quick Usage Modal */}
      {usageSpool && (
        <QuickUsageModal
          isOpen={!!usageSpool}
          onClose={() => setUsageSpool(null)}
          spool={usageSpool}
          onFinished={(finishedSpool, usage) => {
            setClonePromptSpool(finishedSpool);
            setCloneCarryoverUsage(usage);
            setClonePrevCurrentWeight(finishedSpool.currentWeight);
          }}
        />
      )}

      {/* Spool History Modal */}
      {historySpool && (
        <SpoolHistoryModal
          isOpen={!!historySpool}
          onClose={() => setHistorySpool(null)}
          spool={historySpool}
        />
      )}

      {/* Clone Spool Prompt Modal */}
      <CloneSpoolPromptModal
        isOpen={!!clonePromptSpool}
        onClose={() => setClonePromptSpool(null)}
        spool={clonePromptSpool}
        onConfirm={(spool) => handleCloneSpool(spool, cloneCarryoverUsage)}
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

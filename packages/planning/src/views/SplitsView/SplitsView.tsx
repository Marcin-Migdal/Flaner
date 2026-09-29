import { toast } from "@flaner/shared/utils";
import { ConfirmationPopup } from "@flaner/ui-components";
import { Loader2, Wallet } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import type { SplitGroup } from "../../api/splits";
import { useDeleteSplitGroupMutation } from "../../hooks/api/mutation";
import { useGetUserSplitGroupsRealtimeQuery } from "../../hooks/api/query";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { isGroupSettled } from "../../utils/splitBalances";
import { SplitGroupDashboard } from "./components/SplitGroupDashboard/SplitGroupDashboard";
import { SplitGroupModal } from "./components/SplitGroupModal/SplitGroupModal";
import { SplitGroupsList } from "./components/SplitGroupsList/SplitGroupsList";
import { splitsPanelVariants, splitsViewStyles as styles } from "./SplitsView.styles";

type GroupModalState = { mode: "create" } | { mode: "edit"; group: SplitGroup } | null;

export const SplitsView = () => {
  const { t } = usePlanningTranslations();
  const location = useLocation();
  const navigate = useNavigate();
  const [groupModal, setGroupModal] = useState<GroupModalState>(null);
  const [groupToDelete, setGroupToDelete] = useState<SplitGroup | null>(null);

  const { data: groups = [], isLoading } = useGetUserSplitGroupsRealtimeQuery();
  const { mutateAsync: deleteGroup, isPending: isDeletingGroup } = useDeleteSplitGroupMutation();

  const hashId = location.hash.replace("#", "");
  const selectedGroup = groups.find((group) => group.id === hashId) ?? null;
  // On desktop the first group is shown when nothing is selected; on mobile the list is shown instead.
  const displayedGroup = selectedGroup ?? groups[0] ?? null;
  const hasSelection = selectedGroup !== null;

  const handleRequestDelete = (group: SplitGroup) => {
    if (!isGroupSettled(group)) {
      toast.attention(t("splits.deleteGroup.blocked"));
      return;
    }
    setGroupToDelete(group);
  };

  const handleConfirmDelete = async () => {
    if (!groupToDelete) return;
    const deletedId = groupToDelete.id;
    await deleteGroup(deletedId, {
      onSuccess: () => {
        setGroupToDelete(null);
        if (hashId === deletedId) navigate({ hash: "" }, { replace: true });
      },
    });
  };

  return (
    <div className={styles.root}>
      <aside className={splitsPanelVariants({ panel: "sidebar", hiddenOnMobile: hasSelection })}>
        <SplitGroupsList
          groups={groups}
          isLoading={isLoading}
          activeGroupId={displayedGroup?.id}
          onSelectGroup={(groupId) => navigate({ hash: groupId })}
          onCreateGroup={() => setGroupModal({ mode: "create" })}
          onEditGroup={(group) => setGroupModal({ mode: "edit", group })}
          onDeleteGroup={handleRequestDelete}
        />
      </aside>

      <main className={splitsPanelVariants({ panel: "main", hiddenOnMobile: !hasSelection })}>
        {isLoading ? (
          <div className={styles.loader}>
            <Loader2 className={styles.loaderIcon} />
          </div>
        ) : displayedGroup ? (
          <SplitGroupDashboard group={displayedGroup} onBack={() => navigate({ hash: "" })} />
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}>
              <Wallet className={styles.emptyIcon} />
            </div>
            <h2 className={styles.emptyTitle}>{t("splits.dashboard.emptyTitle")}</h2>
            <p className={styles.emptyDesc}>{t("splits.dashboard.emptyDesc")}</p>
          </div>
        )}
      </main>

      <SplitGroupModal
        open={groupModal !== null}
        groupToEdit={groupModal?.mode === "edit" ? groupModal.group : null}
        onOpenChange={(open) => {
          if (!open) setGroupModal(null);
        }}
        onSuccess={(groupId) => navigate({ hash: groupId })}
      />

      <ConfirmationPopup
        open={groupToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setGroupToDelete(null);
        }}
        title={t("splits.deleteGroup.title")}
        description={t("splits.deleteGroup.description", { name: groupToDelete?.name })}
        confirmLabel={t("splits.actions.delete")}
        cancelLabel={t("splits.actions.cancel")}
        onConfirm={handleConfirmDelete}
        isConfirming={isDeletingGroup}
        variant="destructive"
      />
    </div>
  );
};

export default SplitsView;

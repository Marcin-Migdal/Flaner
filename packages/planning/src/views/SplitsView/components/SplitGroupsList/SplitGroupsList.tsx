import { Button, IconTextField } from "@flaner/ui-components";
import { Plus, Search, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import type { SplitGroup } from "../../../../api/splits";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { SplitGroupCard } from "./SplitGroupCard";
import { splitGroupsListStyles as styles } from "./SplitGroupsList.styles";

const SKELETON_COUNT = 4;

export type SplitGroupsListProps = {
  groups: SplitGroup[];
  isLoading: boolean;
  activeGroupId?: string;
  onSelectGroup: (groupId: string) => void;
  onCreateGroup: () => void;
  onEditGroup: (group: SplitGroup) => void;
  onDeleteGroup: (group: SplitGroup) => void;
};

export const SplitGroupsList = ({
  groups,
  isLoading,
  activeGroupId,
  onSelectGroup,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
}: SplitGroupsListProps) => {
  const { t } = usePlanningTranslations();
  const [search, setSearch] = useState("");

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter((group) => group.name.toLowerCase().includes(query));
  }, [groups, search]);

  const renderContent = () => {
    if (isLoading) {
      return Array.from({ length: SKELETON_COUNT }, (_, index) => <div key={index} className={styles.skeleton} />);
    }

    if (groups.length === 0) {
      return (
        <div className={styles.emptyState}>
          <Wallet className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>{t("splits.list.emptyTitle")}</p>
          <p className={styles.emptyDesc}>{t("splits.list.emptyDesc")}</p>
        </div>
      );
    }

    if (filteredGroups.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p className={styles.emptyDesc}>{t("splits.list.noResults")}</p>
        </div>
      );
    }

    return filteredGroups.map((group) => (
      <SplitGroupCard
        key={group.id}
        group={group}
        isActive={group.id === activeGroupId}
        onSelect={() => onSelectGroup(group.id)}
        onEdit={() => onEditGroup(group)}
        onDelete={() => onDeleteGroup(group)}
      />
    ));
  };

  return (
    <div className={styles.root}>
      <div className={styles.glowLayer}>
        <div className={styles.glowTop} />
        <div className={styles.glowBottom} />
      </div>

      <div className={styles.panel}>
        <div className={styles.header}>
          <h3 className={styles.eyebrow}>{t("splits.list.title")}</h3>
          <div className={styles.controls}>
            <IconTextField
              alwaysOpen
              isClearable
              disabled={groups.length === 0}
              className={styles.search}
              icon={<Search className="size-4" />}
              placeholder={t("splits.list.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
            />
            <Button
              type="button"
              variant="brand"
              size="icon"
              className={styles.createButton}
              onClick={onCreateGroup}
              title={t("splits.list.newGroup")}
              aria-label={t("splits.list.newGroup")}
            >
              <Plus className={styles.createButtonIcon} />
            </Button>
          </div>
        </div>

        <div className={styles.list}>{renderContent()}</div>
      </div>
    </div>
  );
};

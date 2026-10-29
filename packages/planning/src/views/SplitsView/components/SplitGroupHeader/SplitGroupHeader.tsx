import { Avatar, AvatarFallback, AvatarImage, Button } from "@flaner/ui-components";
import { ArrowLeft, HandCoins, Plus } from "lucide-react";
import { useState } from "react";
import type { SplitGroup } from "../../../../api/splits";
import type { SplitGroupMember } from "../../../../hooks/useSplitGroupMembers";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { splitGroupHeaderStyles as styles } from "./SplitGroupHeader.styles";
import { QuickAddParticipantPopover } from "./components/QuickAddParticipantPopover";
import { SplitGroupMembersPopover } from "./components/SplitGroupMembersPopover";

const MAX_VISIBLE_AVATARS = 6;

export type SplitGroupHeaderProps = {
  group: SplitGroup;
  members: SplitGroupMember[];
  isMembersLoading: boolean;
  onBack: () => void;
  onAddExpense: () => void;
  onSettleUp: () => void;
};

export const SplitGroupHeader = ({
  group,
  members,
  isMembersLoading,
  onBack,
  onAddExpense,
  onSettleUp,
}: SplitGroupHeaderProps) => {
  const { t } = usePlanningTranslations();
  const [isMembersPopoverOpen, setIsMembersPopoverOpen] = useState(false);

  const visibleMembers = members.slice(0, MAX_VISIBLE_AVATARS);
  const hiddenCount = members.length - visibleMembers.length;

  return (
    <div className={styles.root}>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className={styles.backButton}
        onClick={onBack}
        title={t("splits.dashboard.back")}
        aria-label={t("splits.dashboard.back")}
      >
        <ArrowLeft />
      </Button>

      <div className={styles.titleBlock}>
        <h1 className={styles.title} title={group.name}>
          {group.name}
        </h1>
        {group.description && <p className={styles.description}>{group.description}</p>}

        <SplitGroupMembersPopover
          group={group}
          members={members}
          open={isMembersPopoverOpen}
          onOpenChange={setIsMembersPopoverOpen}
        >
          <div className={styles.membersRow}>
            {isMembersLoading
              ? group.participants
                .slice(0, MAX_VISIBLE_AVATARS)
                .map((id) => <div key={id} className={styles.avatarSkeleton} />)
              : visibleMembers.map((member, index) => (
                <button
                  key={`${member.id}-${index}`}
                  type="button"
                  onClick={() => setIsMembersPopoverOpen(true)}
                  className={styles.avatarButton}
                  title={t("splits.members.title", { count: members.length })}
                  aria-label={t("splits.members.title", { count: members.length })}
                >
                  <Avatar className={styles.avatar}>
                    <AvatarImage src={member.avatarUrl} />
                    <AvatarFallback className={styles.avatarFallback}>
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              ))}
            {!isMembersLoading && hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setIsMembersPopoverOpen(true)}
                className={styles.overflowBadge}
                title={t("splits.members.title", { count: members.length })}
                aria-label={t("splits.members.title", { count: members.length })}
              >
                +{hiddenCount}
              </button>
            )}
            <QuickAddParticipantPopover group={group} />
          </div>
        </SplitGroupMembersPopover>
      </div>

      <div className={styles.actions}>
        <Button
          type="button"
          variant="brand"
          className={styles.primaryAction}
          onClick={onAddExpense}
          title={t("splits.actions.addExpense")}
          aria-label={t("splits.actions.addExpense")}
        >
          <Plus />
          <span className={styles.primaryActionLabel}>{t("splits.actions.addExpense")}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className={styles.secondaryAction}
          onClick={onSettleUp}
          title={t("splits.actions.settleUp")}
          aria-label={t("splits.actions.settleUp")}
        >
          <HandCoins />
          <span className={styles.secondaryActionLabel}>{t("splits.actions.settleUp")}</span>
        </Button>
      </div>
    </div>
  );
};

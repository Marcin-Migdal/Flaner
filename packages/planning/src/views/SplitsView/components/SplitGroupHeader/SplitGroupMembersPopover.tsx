import { useAuth } from "@flaner/shared/context";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  ConfirmationPopup,
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@flaner/ui-components";
import { LogOut, UserMinus } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router";
import type { SplitGroup } from "../../../../api/splits";
import { useRemoveParticipantFromGroupMutation } from "../../../../hooks/api/mutation";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import type { SplitGroupMember } from "../../../../hooks/useSplitGroupMembers";
import { hasOutstandingBalance } from "../../../../utils/splitBalances";
import { splitGroupMembersPopoverStyles as styles } from "./SplitGroupMembersPopover.styles";

export type SplitGroupMembersPopoverProps = {
  group: SplitGroup;
  members: SplitGroupMember[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
};

type ConfirmState = {
  member: SplitGroupMember;
  type: "remove" | "leave";
} | null;

export const SplitGroupMembersPopover = ({
  group,
  members,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  children,
}: SplitGroupMembersPopoverProps) => {
  const { t } = usePlanningTranslations();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;
  const setIsOpen = isControlled ? (setControlledOpen ?? (() => {})) : setUncontrolledOpen;

  const { mutateAsync: removeParticipant, isPending: isRemoving } = useRemoveParticipantFromGroupMutation();

  const currentUserId = user?.uid ?? "";
  const isOwner = group.createdBy === currentUserId;

  const handleConfirm = async () => {
    if (!confirmState) return;
    const isLeavingSelf = confirmState.member.id === currentUserId;

    try {
      await removeParticipant(
        { groupId: group.id, participantId: confirmState.member.id },
        {
          onSuccess: () => {
            setConfirmState(null);
            if (isLeavingSelf) {
              setIsOpen(false);
              navigate({ hash: "" }, { replace: true });
            }
          },
        },
      );
    } catch {
      // Handled by mutation's global onError toast
    }
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        {children && <PopoverAnchor asChild>{children}</PopoverAnchor>}
        <PopoverContent align="start" className={styles.content}>
          <div className={styles.header}>
            <span className={styles.title}>{t("splits.members.title", { count: members.length })}</span>
          </div>

          <div className={styles.list}>
            {members.map((member) => {
              const hasBalance = hasOutstandingBalance(group, member.id);
              const isMemberOwner = member.id === group.createdBy;
              const isCurrentUser = member.id === currentUserId;

              return (
                <div key={member.id} className={styles.memberRow}>
                  <div className={styles.memberInfo}>
                    <Avatar className={styles.avatar}>
                      <AvatarImage src={member.avatarUrl} />
                      <AvatarFallback className={styles.avatarFallback}>
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className={styles.nameBlock}>
                      <div className={styles.nameRow}>
                        <span className={styles.name}>{member.name}</span>
                        {isCurrentUser && <span className={styles.youBadge}>({t("splits.you")})</span>}
                        {isMemberOwner && (
                          <span className={styles.creatorBadge}>{t("splits.members.creatorBadge")}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Owner can remove other participants */}
                  {isOwner && !isMemberOwner && (
                    <span
                      className={hasBalance ? styles.disabledActionWrapper : undefined}
                      title={hasBalance ? t("splits.members.blockedBalance") : t("splits.members.remove")}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={styles.actionButton}
                        disabled={hasBalance}
                        onClick={() => setConfirmState({ member, type: "remove" })}
                        aria-label={t("splits.members.remove")}
                      >
                        <UserMinus className="size-4" />
                      </Button>
                    </span>
                  )}

                  {/* Non-owner can leave the group themselves */}
                  {!isOwner && isCurrentUser && (
                    <span
                      className={hasBalance ? styles.disabledActionWrapper : undefined}
                      title={hasBalance ? t("splits.members.blockedBalance") : t("splits.members.leave")}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={styles.actionButton}
                        disabled={hasBalance}
                        onClick={() => setConfirmState({ member, type: "leave" })}
                        aria-label={t("splits.members.leave")}
                      >
                        <LogOut className="size-4" />
                      </Button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <ConfirmationPopup
        open={confirmState !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
        title={
          confirmState?.type === "leave"
            ? t("splits.members.leaveTitle")
            : t("splits.members.removeTitle")
        }
        description={
          confirmState?.type === "leave"
            ? t("splits.members.leaveDesc", { name: group.name })
            : t("splits.members.removeDesc", { name: confirmState?.member.name })
        }
        confirmLabel={
          confirmState?.type === "leave"
            ? t("splits.members.leave")
            : t("splits.members.remove")
        }
        cancelLabel={t("splits.actions.cancel")}
        onConfirm={handleConfirm}
        isConfirming={isRemoving}
        variant="destructive"
      />
    </>
  );
};

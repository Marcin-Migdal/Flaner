import { useAuth } from "@flaner/shared/context";
import { Avatar, AvatarFallback, AvatarImage, Button, ConfirmationPopup } from "@flaner/ui-components";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Loader2, LogOut, Shield, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { InviteToGroupModal } from "../../components/groups/InviteToGroupModal";
import { ManageGroupSheet } from "../../components/groups/ManageGroupSheet";
import { RequestsSheet } from "../../components/groups/RequestsSheet";
import {
  useAddGroupMemberMutation,
  useGetGroupMembersQuery,
  useGetGroupQuery,
  useGetUserGroupRequestQuery,
  useGetUsersQuery,
  useRemoveGroupMemberMutation,
  useRequestJoinGroupMutation,
} from "../../hooks";
import { useCommunityTranslations } from "../../hooks/useCommunityTranslations";
import { groupDetailsViewStyles } from "./GroupDetailsView.styles";

export function GroupDetailsView() {
  const { t } = useCommunityTranslations();
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const { data: group, isLoading: groupLoading } = useGetGroupQuery(groupId || "");
  const { data: members = [], isLoading: membersLoading } = useGetGroupMembersQuery(groupId || "");

  const memberUserIds = members.map((m) => m.userId);
  const { data: membersProfiles, isLoading: profilesLoading } = useGetUsersQuery(memberUserIds);

  // We check if the current user has a pending request for this group
  const { data: userRequest } = useGetUserGroupRequestQuery(groupId || "");

  const { mutateAsync: joinGroup, isPending: isJoining } = useAddGroupMemberMutation();
  const { mutateAsync: requestJoin, isPending: isRequesting } = useRequestJoinGroupMutation();
  const { mutateAsync: leaveGroup, isPending: isLeaving } = useRemoveGroupMemberMutation({
    meta: {
      successMessageKey: "community:toasts.groupDetails.leaveSuccess",
      errorMessageKey: "community:toasts.groupDetails.leaveError",
    },
  });

  if (groupLoading || membersLoading) return <div className="p-8 text-center">{t("groupDetails.loading")}</div>;
  if (!group) return <div className="p-8 text-center text-destructive">{t("groupDetails.notFound")}</div>;

  const isMember = members.some((m) => m.userId === user?.uid);
  const currentUserRole = members.find((m) => m.userId === user?.uid)?.role;
  const hasRequested = !!userRequest;
  const canInvite = isMember && (group.type !== "private" || (currentUserRole && currentUserRole !== "member"));

  // State 2.3: Edge case - navigating to a private group without being a member
  if (!isMember && group.type === "private") {
    return (
      <div className={groupDetailsViewStyles.root}>
        <div className={groupDetailsViewStyles.backButtonContainer}>
          <Button variant="ghost" size="icon" onClick={() => navigate("/community/groups")} className="rounded-full">
            <ArrowLeft className="size-5" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground">{t("groupDetails.backToList")}</span>
        </div>
        <div className="p-8 text-center text-destructive bg-destructive/10 rounded-xl border border-destructive/20 font-medium">
          {t("groupDetails.accessDenied")}
        </div>
      </div>
    );
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success(t("toasts.groupDetails.copySuccess"));
  };

  const handleJoin = async () => {
    if (!user) return;
    try {
      await joinGroup({ groupId: group.id, userId: user.uid });

      queryClient.invalidateQueries({ queryKey: ["groupMembers", group.id] });
      queryClient.invalidateQueries({ queryKey: ["userGroups", user.uid] });
    } catch {
      // Handled globally
    }
  };

  const handleRequestJoin = async () => {
    if (!user) return;
    try {
      await requestJoin(group.id);

      queryClient.invalidateQueries({ queryKey: ["groupRequests", group.id] });
    } catch {
      // Handled globally
    }
  };

  const handleLeaveGroup = async () => {
    if (!user) return;
    try {
      await leaveGroup({ groupId: group.id, userId: user.uid });
      setIsLeaveConfirmOpen(false);

      navigate("/community/groups");
    } catch {
      // Handled globally
    }
  };

  const renderRestrictedActions = () => {
    if (group.requiresApproval) {
      if (hasRequested) {
        return (
          <Button variant="outline" disabled className="rounded-xl flex-1 lg:flex-none bg-muted/50">
            {t("groupDetails.requestPending")}
          </Button>
        );
      }
      return (
        <Button
          variant="brand"
          className="rounded-xl flex-1 lg:flex-none"
          onClick={handleRequestJoin}
          disabled={isRequesting}
        >
          {isRequesting ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("groupDetails.requestToJoin")}
        </Button>
      );
    }

    // Public group, no approval required
    return (
      <Button variant="brand" className="rounded-xl flex-1 lg:flex-none" onClick={handleJoin} disabled={isJoining}>
        {isJoining ? <Loader2 className="size-4 animate-spin" /> : null}
        {t("groupDetails.joinGroup")}
      </Button>
    );
  };

  return (
    <div className={groupDetailsViewStyles.root}>
      <div className={groupDetailsViewStyles.backButtonContainer}>
        <Button variant="ghost" size="icon" onClick={() => navigate("/community/groups")} className="rounded-full">
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">{t("groupDetails.backToList")}</span>
      </div>

      <div className={groupDetailsViewStyles.headerCard}>
        <div className={groupDetailsViewStyles.groupInfoWrapper}>
          <div className={groupDetailsViewStyles.avatar}>
            {group.avatarUrl ? (
              <img src={group.avatarUrl} alt={group.name} className="size-full object-cover" />
            ) : (
              group.name.substring(0, 2).toUpperCase()
            )}
          </div>

          <div className={groupDetailsViewStyles.infoContent}>
            <h1 className={groupDetailsViewStyles.title}>{group.name}</h1>
            {group.description && (
              <p className={groupDetailsViewStyles.description}>{group.description}</p>
            )}

            <div className={groupDetailsViewStyles.badgeList}>
              <span className={groupDetailsViewStyles.badge}>
                <Users className="size-3 sm:size-3.5" />
                {t("groupDetails.membersCount", { count: members.length })}
              </span>
              <span className={groupDetailsViewStyles.badge}>
                <Shield className="size-3 sm:size-3.5" />
                {group.type === "private" ? t("groupDetails.private") : t("groupDetails.public")}
              </span>
              {isMember && currentUserRole && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-brand/10 text-brand rounded-full border border-brand/20 text-[11px] sm:text-xs font-semibold">
                  {t(`manageGroupSheet.role_${currentUserRole}`) || currentUserRole}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={groupDetailsViewStyles.actionButtonsWrapper}>
          <Button
            variant="outline"
            className={groupDetailsViewStyles.actionButton}
            onClick={handleCopyLink}
          >
            <Copy className="size-3.5 sm:size-4 shrink-0" />
            <span>{t("groupDetails.copyLinkBtn")}</span>
          </Button>

          {!isMember ? (
            renderRestrictedActions()
          ) : (
            <>
              {canInvite && (
                <Button
                  variant="brand"
                  className={groupDetailsViewStyles.actionButton}
                  onClick={() => setIsInviteModalOpen(true)}
                >
                  <UserPlus className="size-3.5 sm:size-4 shrink-0" />
                  <span>{t("manageGroupSheet.inviteFriends")}</span>
                </Button>
              )}
              {(currentUserRole === "owner" || currentUserRole === "admin") && <RequestsSheet groupId={group.id} />}
              {(currentUserRole === "owner" || currentUserRole === "admin" || currentUserRole === "moderator") && (
                <ManageGroupSheet groupId={group.id} />
              )}
              {currentUserRole !== "owner" && (
                <>
                  <Button
                    variant="outline"
                    className="rounded-xl h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 flex-1 lg:flex-none flex items-center justify-center gap-1.5 cursor-pointer"
                    onClick={() => setIsLeaveConfirmOpen(true)}
                    disabled={isLeaving}
                  >
                    {isLeaving ? <Loader2 className="size-3.5 sm:size-4 animate-spin shrink-0" /> : <LogOut className="size-3.5 sm:size-4 shrink-0" />}
                    <span>{t("groupDetails.leaveGroup")}</span>
                  </Button>

                  <ConfirmationPopup
                    open={isLeaveConfirmOpen}
                    onOpenChange={setIsLeaveConfirmOpen}
                    title={t("groupDetails.leaveConfirmTitle")}
                    description={t("groupDetails.leaveConfirmDesc")}
                    confirmLabel={t("groupDetails.confirmLeaveBtn")}
                    cancelLabel={t("groupDetails.cancelBtn")}
                    variant="destructive"
                    isConfirming={isLeaving}
                    onConfirm={handleLeaveGroup}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Members Section - Only visible to members */}
      {isMember && (
        <div className={groupDetailsViewStyles.membersSection}>
          <h2 className="text-xl font-bold font-heading">{t("groupDetails.membersTitle")}</h2>
          <div className={groupDetailsViewStyles.membersCard}>
            {membersLoading || profilesLoading ? (
              <div className="p-8 text-center text-muted-foreground">{t("groupDetails.loadingMembers")}</div>
            ) : (
              <div className="divide-y divide-border/50">
                {members.map((member) => {
                  const profile = membersProfiles?.find((p) => p.uid === member.userId);
                  const displayName = profile?.username || member.userId;
                  const initials = displayName.substring(0, 2).toUpperCase();

                  return (
                    <div
                      key={member.userId}
                      className={groupDetailsViewStyles.memberRow}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10 border border-border">
                          {profile?.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={displayName} />}
                          <AvatarFallback className="bg-gradient-to-tr from-brand to-brand-dark text-zinc-950 font-bold text-sm">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{displayName}</span>
                      </div>
                      <div>
                        <span className={groupDetailsViewStyles.memberRoleBadge}>
                          {t(`manageGroupSheet.role_${member.role}`) || member.role}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <InviteToGroupModal
        groupId={group.id}
        groupName={group.name}
        groupAvatarUrl={group.avatarUrl}
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
      />
    </div>
  );
}

export default GroupDetailsView;

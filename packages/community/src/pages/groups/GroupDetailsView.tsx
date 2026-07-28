import { useAuth } from "@flaner-v2/shared";
import { Avatar, AvatarFallback, AvatarImage, Button, ConfirmationPopup } from "@flaner-v2/ui-components";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Loader2, LogOut, Shield, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { InviteToGroupModal } from "../../components/groups/InviteToGroupModal";
import { ManageGroupSheet } from "../../components/groups/ManageGroupSheet";
import { RequestsSheet } from "../../components/groups/RequestsSheet";
import { useAddGroupMemberMutation, useGetGroupMembersQuery, useGetGroupQuery, useGetUserGroupRequestQuery, useGetUsersQuery, useRemoveGroupMemberMutation, useRequestJoinGroupMutation } from "../../hooks";
import { useCommunityTranslations } from "../../hooks/useCommunityTranslations";

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
  const { mutateAsync: leaveGroup, isPending: isLeaving } = useRemoveGroupMemberMutation();

  if (groupLoading || membersLoading) return <div className="p-8 text-center">{t("groupDetails.loading")}</div>;
  if (!group) return <div className="p-8 text-center text-destructive">{t("groupDetails.notFound")}</div>;

  const isMember = members.some((m) => m.userId === user?.uid);
  const currentUserRole = members.find((m) => m.userId === user?.uid)?.role;
  const hasRequested = !!userRequest;
  const canInvite = isMember && (group.type !== "private" || (currentUserRole && currentUserRole !== "member"));

  // State 2.3: Edge case - navigating to a private group without being a member
  if (!isMember && group.type === "private") {
    return (
      <div className="max-w-4xl mx-auto py-6 space-y-8 px-4 md:px-0">
        <div className="flex items-center gap-4 mb-2">
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
    toast.success(t("groupDetails.copySuccess"));
  };

  const handleJoin = async () => {
    if (!user) return;
    try {
      await joinGroup({ groupId: group.id, userId: user.uid });
      toast.success(t("groupDetails.joinSuccess"));
      queryClient.invalidateQueries({ queryKey: ["groupMembers", group.id] });
      queryClient.invalidateQueries({ queryKey: ["userGroups", user.uid] });
    } catch (err) {
      toast.error(t("groupDetails.joinError"));
    }
  };

  const handleRequestJoin = async () => {
    if (!user) return;
    try {
      await requestJoin(group.id);
      toast.success(t("groupDetails.requestSuccess"));
      queryClient.invalidateQueries({ queryKey: ["groupRequests", group.id] });
    } catch (err) {
      toast.error(t("groupDetails.requestError"));
    }
  };

  const handleLeaveGroup = async () => {
    if (!user) return;
    try {
      await leaveGroup({ groupId: group.id, userId: user.uid });
      setIsLeaveConfirmOpen(false);
      toast.success(t("groupDetails.leaveSuccess"));
      navigate("/community/groups");
    } catch (err) {
      toast.error(t("groupDetails.leaveError"));
    }
  };

  const renderRestrictedActions = () => {
    if (group.requiresApproval) {
      if (hasRequested) {
        return (
          <Button variant="outline" disabled className="rounded-xl flex-1 md:flex-none bg-muted/50">
            {t("groupDetails.requestPending")}
          </Button>
        );
      }
      return (
        <Button
          variant="brand"
          className="rounded-xl flex-1 md:flex-none"
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
      <Button variant="brand" className="rounded-xl flex-1 md:flex-none" onClick={handleJoin} disabled={isJoining}>
        {isJoining ? <Loader2 className="size-4 animate-spin" /> : null}
        {t("groupDetails.joinGroup")}
      </Button>
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8 px-4 md:px-0">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/community/groups")} className="rounded-full">
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">{t("groupDetails.backToList")}</span>
      </div>

      <div className="relative bg-card border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="flex-shrink-0 size-24 rounded-2xl bg-gradient-to-br from-brand/20 to-brand/5 flex items-center justify-center text-brand font-bold text-3xl shadow-inner border border-brand/10">
            {group.avatarUrl ? (
              <img src={group.avatarUrl} alt={group.name} className="size-full object-cover rounded-2xl" />
            ) : (
              group.name.substring(0, 2).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">{group.name}</h1>
            {group.description && <p className="text-muted-foreground text-sm mt-1 max-w-2xl">{group.description}</p>}

            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-muted/60 rounded-full border border-border/40">
                <Users className="size-3.5" />
                {t("groupDetails.membersCount", { count: members.length })}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-muted/60 rounded-full border border-border/40">
                <Shield className="size-3.5" />
                {group.type === "private" ? t("groupDetails.private") : t("groupDetails.public")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" className="rounded-xl flex-1 md:flex-none" onClick={handleCopyLink}>
              <Copy className="size-4" />
              {t("groupDetails.copyLinkBtn")}
            </Button>

            {!isMember ? (
              renderRestrictedActions()
            ) : (
              <>
                {canInvite && (
                  <Button
                    variant="primary"
                    className="rounded-xl flex-1 md:flex-none font-semibold"
                    onClick={() => setIsInviteModalOpen(true)}
                  >
                    <UserPlus className="size-4" />
                    {t("manageGroupSheet.inviteFriends")}
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
                      className="rounded-xl flex-1 md:flex-none text-destructive hover:bg-destructive hover:text-white"
                      onClick={() => setIsLeaveConfirmOpen(true)}
                      disabled={isLeaving}
                    >
                      {isLeaving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <LogOut className="size-4" />
                      )}
                      {t("groupDetails.leaveGroup")}
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
      </div>

      {/* Members Section - Only visible to members */}
      {isMember && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold font-heading">{t("groupDetails.membersTitle")}</h2>
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
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
                      className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
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
                        <span className="text-xs font-medium px-2 py-1 bg-brand/10 text-brand rounded-md uppercase tracking-wider">
                          {member.role}
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

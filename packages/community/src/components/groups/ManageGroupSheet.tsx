import { useAuth } from "@flaner/shared/context";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  ConfirmationPopup,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@flaner/ui-components";
import { Crown, MoreVertical, Settings, Shield, ShieldAlert, ShieldCheck, Trash2, UserMinus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import type { GroupMember, GroupRole } from '../../api/groups';
import {
  useDeleteGroupMutation,
  useGetGroupMembersQuery,
  useGetUsersQuery,
  useRemoveGroupMemberMutation,
  useTransferGroupOwnershipMutation,
  useUpdateGroupMemberRoleMutation,
} from "../../hooks";
import { useCommunityTranslations } from "../../hooks/useCommunityTranslations";

interface ManageGroupSheetProps {
  groupId: string;
}

export function ManageGroupSheet({ groupId }: ManageGroupSheetProps) {
  const { t } = useCommunityTranslations();
  const { user } = useAuth();

  const { data: members = [], isLoading: membersLoading } = useGetGroupMembersQuery(groupId);
  const memberUserIds = members.map((m) => m.userId);
  const { data: membersProfiles, isLoading: profilesLoading } = useGetUsersQuery(memberUserIds);

  const navigate = useNavigate();
  const updateRoleMutation = useUpdateGroupMemberRoleMutation();
  const transferOwnershipMutation = useTransferGroupOwnershipMutation();
  const removeMemberMutation = useRemoveGroupMemberMutation();
  const deleteGroupMutation = useDeleteGroupMutation();

  const [confirmTransferUserId, setConfirmTransferUserId] = useState<string | null>(null);
  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const currentUserRole = members.find((m) => m.userId === user?.uid)?.role;

  // Helpers
  const ROLE_PRIORITY: Record<GroupRole, number> = {
    owner: 4,
    admin: 3,
    moderator: 2,
    member: 1,
  };

  const currentPriority = currentUserRole ? ROLE_PRIORITY[currentUserRole] : 0;

  const canManageMember = (targetRole: GroupRole) => {
    if (!currentUserRole) return false;
    return currentPriority > ROLE_PRIORITY[targetRole];
  };

  const getRoleOption = (targetMember: GroupMember, roleToAssign: GroupRole) => {
    const isPromotion = ROLE_PRIORITY[roleToAssign] > ROLE_PRIORITY[targetMember.role];

    if (roleToAssign === "admin") {
      return {
        label: t("manageGroupSheet.promoteToAdmin"),
        icon: <ShieldCheck className="size-4 mr-2 text-blue-500" />,
      };
    }

    if (roleToAssign === "moderator") {
      return {
        label: isPromotion ? t("manageGroupSheet.promoteToModerator") : t("manageGroupSheet.demoteToModerator"),
        icon: <ShieldAlert className="size-4 mr-2 text-orange-500" />,
      };
    }

    if (roleToAssign === "member") {
      return {
        label: t("manageGroupSheet.demoteToMember"),
        icon: <Shield className="size-4 mr-2 text-muted-foreground" />,
      };
    }

    return null;
  };

  const handleUpdateRole = async (targetUserId: string, newRole: GroupRole) => {
    try {
      await updateRoleMutation.mutateAsync({ groupId, userId: targetUserId, role: newRole });
      toast.success(t("manageGroupSheet.roleUpdateSuccess"));
    } catch (err) {
      if ((err as Error).message?.includes("permission-denied")) {
        toast.error(t("manageGroupSheet.permissionDenied"));
      } else {
        toast.error(t("manageGroupSheet.roleUpdateError"));
      }
    }
  };

  const handleTransferOwnership = async () => {
    if (!user || !confirmTransferUserId) return;
    try {
      await transferOwnershipMutation.mutateAsync({
        groupId,
        currentOwnerId: user.uid,
        newOwnerId: confirmTransferUserId,
      });
      setConfirmTransferUserId(null);
      toast.success(t("manageGroupSheet.transferSuccess"));
    } catch (err) {
      if ((err as Error).message?.includes("permission-denied")) {
        toast.error(t("manageGroupSheet.permissionDenied"));
      } else {
        toast.error(t("manageGroupSheet.transferError"));
      }
    }
  };

  const handleRemoveMember = async () => {
    if (!confirmRemoveUserId) return;
    try {
      await removeMemberMutation.mutateAsync({ groupId, userId: confirmRemoveUserId });
      setConfirmRemoveUserId(null);
      toast.success(t("manageGroupSheet.removeSuccess"));
    } catch (err) {
      if ((err as Error).message?.includes("permission-denied")) {
        toast.error(t("manageGroupSheet.permissionDenied"));
      } else {
        toast.error(t("manageGroupSheet.removeError"));
      }
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await deleteGroupMutation.mutateAsync(groupId);
      setIsDeleteConfirmOpen(false);
      toast.success(t("manageGroupSheet.deleteSuccess"));
      navigate("/community/groups");
    } catch (err) {
      if ((err as Error).message?.includes("permission-denied")) {
        toast.error(t("manageGroupSheet.permissionDenied"));
      } else {
        toast.error(t("manageGroupSheet.deleteError"));
      }
    }
  };

  const getRoleIcon = (role: GroupRole) => {
    switch (role) {
      case "owner":
        return <Crown className="size-4 text-yellow-500" />;
      case "admin":
        return <ShieldCheck className="size-4 text-blue-500" />;
      case "moderator":
        return <ShieldAlert className="size-4 text-orange-500" />;
      default:
        return <Shield className="size-4 text-muted-foreground" />;
    }
  };

  const getRoleTranslation = (role: GroupRole) => {
    return t(`manageGroupSheet.role_${role}`) || role;
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="primary" className="rounded-xl flex-1 md:flex-none">
            <Settings className="size-4" />
            {t("groupDetails.manageBtn")}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md p-6 bg-card/95 backdrop-blur-md border-l border-border flex flex-col h-full shadow-2xl">
          <SheetHeader className="p-0 border-b border-border pb-4">
            <SheetTitle className="text-xl font-bold font-heading">{t("manageGroupSheet.title")}</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground mt-1">
              {t("manageGroupSheet.desc")}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 scrollbar-none">
            {membersLoading || profilesLoading ? (
              <div className="flex justify-center py-4">
                <div className="text-center text-muted-foreground">{t("groupDetails.loading")}</div>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member: GroupMember) => {
                  const profile = membersProfiles?.find((p) => p.uid === member.userId);
                  const displayName = profile?.username || member.userId;
                  const initials = displayName.substring(0, 2).toUpperCase();

                  const canManage = canManageMember(member.role) && member.userId !== user?.uid;

                  return (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors border border-transparent hover:border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10 border border-border">
                          {profile?.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={displayName} />}
                          <AvatarFallback className="bg-gradient-to-tr from-brand to-brand-dark text-zinc-950 font-bold text-sm">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm flex items-center gap-1.5">
                            {displayName}
                            {member.userId === user?.uid && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm ml-1">
                                {t("manageGroupSheet.you")}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            {getRoleIcon(member.role)}
                            {getRoleTranslation(member.role)}
                          </div>
                        </div>
                      </div>

                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 rounded-full">
                              <MoreVertical className="size-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {(["admin", "moderator", "member"] as GroupRole[]).map((roleToAssign) => {
                              if (currentPriority <= ROLE_PRIORITY[roleToAssign] || roleToAssign === member.role) {
                                return null;
                              }
                              const option = getRoleOption(member, roleToAssign);
                              if (!option) return null;

                              return (
                                <DropdownMenuItem
                                  key={roleToAssign}
                                  onClick={() => handleUpdateRole(member.userId, roleToAssign)}
                                >
                                  {option.icon}
                                  {option.label}
                                </DropdownMenuItem>
                              );
                            })}

                            {currentUserRole === "owner" && (
                              <DropdownMenuItem
                                className="text-yellow-600 focus:text-yellow-700"
                                onClick={() => setConfirmTransferUserId(member.userId)}
                              >
                                <Crown className="size-4 mr-2" />
                                {t("manageGroupSheet.transferOwnership")}
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setConfirmRemoveUserId(member.userId)}
                            >
                              <UserMinus className="size-4 mr-2" />
                              {t("manageGroupSheet.removeMember")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {currentUserRole === "owner" && (
              <div className="pt-4 border-t border-border mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-destructive mb-2">
                  {t("manageGroupSheet.dangerZoneTitle")}
                </h4>
                <Button
                  variant="outline"
                  isBusy={deleteGroupMutation.isPending}
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive hover:text-white rounded-xl flex items-center justify-center gap-2"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                >
                  <Trash2 className="size-4" />
                  {t("manageGroupSheet.deleteGroupBtn")}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmationPopup
        open={!!confirmTransferUserId}
        onOpenChange={(isOpen) => !isOpen && setConfirmTransferUserId(null)}
        title={t("manageGroupSheet.transferConfirmTitle")}
        description={t("manageGroupSheet.transferConfirmDesc")}
        confirmLabel={t("manageGroupSheet.transferConfirmBtn")}
        cancelLabel={t("groupDetails.cancelBtn")}
        variant="destructive"
        isConfirming={transferOwnershipMutation.isPending}
        onConfirm={handleTransferOwnership}
      />

      <ConfirmationPopup
        open={!!confirmRemoveUserId}
        onOpenChange={(isOpen) => !isOpen && setConfirmRemoveUserId(null)}
        title={t("manageGroupSheet.removeConfirmTitle")}
        description={t("manageGroupSheet.removeConfirmDesc")}
        confirmLabel={t("manageGroupSheet.removeConfirmBtn")}
        cancelLabel={t("groupDetails.cancelBtn")}
        variant="destructive"
        isConfirming={removeMemberMutation.isPending}
        onConfirm={handleRemoveMember}
      />

      <ConfirmationPopup
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title={t("manageGroupSheet.deleteConfirmTitle")}
        description={t("manageGroupSheet.deleteConfirmDesc")}
        confirmLabel={t("manageGroupSheet.deleteConfirmBtn")}
        cancelLabel={t("groupDetails.cancelBtn")}
        variant="destructive"
        isConfirming={deleteGroupMutation.isPending}
        onConfirm={handleDeleteGroup}
      />
    </>
  );
}

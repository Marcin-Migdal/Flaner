import { useAuth } from "@flaner/shared/context";
import { useSheet } from "@flaner/shared/hooks";
import { compressImage, ONE_MB, uploadToCloudinary } from "@flaner/shared/utils";
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
  FormImagePicker,
  FormSelect,
  FormSwitch,
  FormTextArea,
  FormTextField,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { Crown, MoreVertical, Settings, Shield, ShieldAlert, ShieldCheck, Trash2, UserMinus } from "lucide-react";
import { useEffect, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router";
import type { GroupMember, GroupRole } from "../../api/groups";
import {
  useDeleteGroupMutation,
  useGetGroupMembersQuery,
  useGetGroupQuery,
  useGetUsersQuery,
  useRemoveGroupMemberMutation,
  useTransferGroupOwnershipMutation,
  useUpdateGroupMemberRoleMutation,
  useUpdateGroupMutation,
} from "../../hooks";
import { useCommunityTranslations } from "../../hooks/useCommunityTranslations";
import { updateGroupSchema, type UpdateGroupSchema } from "../../utils/schemas/groups";

interface ManageGroupSheetProps {
  groupId: string;
}

export function ManageGroupSheet({ groupId }: ManageGroupSheetProps) {
  const { t } = useCommunityTranslations();
  const { user } = useAuth();
  const [isOpen, { setOpen }] = useSheet();

  const { data: group } = useGetGroupQuery(groupId);
  const { data: members = [], isLoading: membersLoading } = useGetGroupMembersQuery(groupId);
  const memberUserIds = members.map((m) => m.userId);
  const { data: membersProfiles, isLoading: profilesLoading } = useGetUsersQuery(memberUserIds);

  const navigate = useNavigate();
  const updateGroupMutation = useUpdateGroupMutation();
  const updateRoleMutation = useUpdateGroupMemberRoleMutation();
  const transferOwnershipMutation = useTransferGroupOwnershipMutation();
  const removeMemberMutation = useRemoveGroupMemberMutation();
  const deleteGroupMutation = useDeleteGroupMutation();

  const [confirmTransferUserId, setConfirmTransferUserId] = useState<string | null>(null);
  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const isUpdatingGroup = updateGroupMutation.isPending || isUploading;
  const currentUserRole = members.find((m) => m.userId === user?.uid)?.role;

  const methods = useForm<UpdateGroupSchema>({
    resolver: zodResolver(updateGroupSchema),
    defaultValues: {
      name: group?.name || "",
      description: group?.description || "",
      type: group?.type || "private",
      requiresApproval: group?.requiresApproval || false,
      avatarUrl: group?.avatarUrl || "",
    },
  });

  const { handleSubmit, reset, control } = methods;
  const groupType = useWatch({ control, name: "type" });

  useEffect(() => {
    if (group && isOpen) {
      reset({
        name: group.name,
        description: group.description || "",
        type: group.type,
        requiresApproval: group.requiresApproval || false,
        avatarUrl: group.avatarUrl || "",
      });
    }
  }, [group, isOpen, reset]);

  const onSaveGroup = async (data: UpdateGroupSchema) => {
    try {
      setIsUploading(true);
      let finalAvatarUrl: string | null = group?.avatarUrl || null;

      if (data.avatarUrl instanceof File) {
        const compressed = await compressImage(data.avatarUrl, ONE_MB);
        finalAvatarUrl = await uploadToCloudinary(compressed);
      } else if (typeof data.avatarUrl === "string") {
        finalAvatarUrl = data.avatarUrl || null;
      }

      const payload = {
        name: data.name,
        description: data.description || "",
        type: data.type,
        requiresApproval: data.requiresApproval,
        avatarUrl: finalAvatarUrl,
      };

      await updateGroupMutation.mutateAsync({
        groupId,
        data: payload,
      });
    } catch (error) {
      console.error("Failed to update group", error);
    } finally {
      setIsUploading(false);
    }
  };

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
    } catch {
      // Handled globally
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
    } catch {
      // Handled globally
    }
  };

  const handleRemoveMember = async () => {
    if (!confirmRemoveUserId) return;
    try {
      await removeMemberMutation.mutateAsync({ groupId, userId: confirmRemoveUserId });
      setConfirmRemoveUserId(null);
    } catch {
      // Handled globally
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await deleteGroupMutation.mutateAsync(groupId);
      setIsDeleteConfirmOpen(false);
      navigate("/community/groups");
    } catch {
      // Handled globally
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
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="rounded-xl h-9 md:h-10 px-3 md:px-4 text-xs md:text-sm flex-1 md:flex-none flex items-center justify-center gap-1.5">
            <Settings className="size-3.5 md:size-4 shrink-0" />
            <span>{t("groupDetails.manageBtn")}</span>
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full max-w-full data-[side=right]:w-full data-[side=right]:sm:max-w-[500px] data-[side=right]:sm:w-[500px] p-0 gap-0 bg-card/95 backdrop-blur-md border-l border-border flex flex-col h-full shadow-2xl">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <SheetTitle className="text-xl font-bold font-heading">{t("manageGroupSheet.title")}</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground mt-1">
              {t("manageGroupSheet.desc")}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-5 px-6 pt-4 pb-6 flex flex-col min-h-0">
            {/* Edit Group Section - Owner only */}
            {currentUserRole === "owner" && (
              <div className="space-y-3 shrink-0">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 px-0.5">
                  {t("manageGroupSheet.editGroupSection")}
                </div>

                <FormProvider {...methods}>
                  <form onSubmit={handleSubmit(onSaveGroup)} className="space-y-3">
                    <FormImagePicker
                      control={control}
                      name="avatarUrl"
                      label={t("manageGroupSheet.avatarLabel")}
                      disabled={isUpdatingGroup}
                      maxSize={ONE_MB}
                      containerClassName="[&_[role=button]]:h-24! [&_[role=button]]:min-h-[6rem]! [&_[role=button]]:p-2! [&_[role=button]]:gap-0.5 [&_[role=button]_svg]:size-5! [&_[role=button]_svg]:mb-0.5! [&_[data-slot=attachment]]:h-24! [&_[data-slot=attachment]]:min-h-[6rem]! [&_[data-slot=attachment]]:p-2! [&_[data-slot=attachment-media]]:h-14! [&_[data-slot=attachment-media]]:w-14!"
                    />

                    <FormTextField
                      control={control}
                      name="name"
                      label={t("manageGroupSheet.nameLabel")}
                      placeholder={t("manageGroupSheet.namePlaceholder")}
                      disabled={isUpdatingGroup}
                    />

                    <FormTextArea
                      control={control}
                      name="description"
                      label={t("manageGroupSheet.descLabel")}
                      placeholder={t("manageGroupSheet.descPlaceholder")}
                      disabled={isUpdatingGroup}
                      rows={2}
                    />

                    <FormSelect
                      control={control}
                      name="type"
                      label={t("manageGroupSheet.typeLabel")}
                      options={[
                        { label: t("manageGroupSheet.typePrivate"), value: "private" },
                        { label: t("manageGroupSheet.typePublic"), value: "public" },
                      ]}
                      isSearchable={false}
                      disabled={isUpdatingGroup}
                    />

                    {groupType === "public" && (
                      <div className="p-3 bg-card rounded-xl border border-border/60">
                        <FormSwitch
                          control={control}
                          name="requiresApproval"
                          label={t("manageGroupSheet.requiresApprovalLabel")}
                          description={t("manageGroupSheet.requiresApprovalDesc")}
                          disabled={isUpdatingGroup}
                        />
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="brand"
                      className="w-full rounded-xl h-10 font-semibold shadow-sm hover:brightness-105 transition-all mt-1"
                      isBusy={isUpdatingGroup}
                    >
                      {t("manageGroupSheet.saveChanges")}
                    </Button>
                  </form>
                </FormProvider>
              </div>
            )}

            {/* Members Section */}
            {membersLoading || profilesLoading ? (
              <div className="flex justify-center py-4 shrink-0">
                <div className="text-center text-muted-foreground">{t("groupDetails.loading")}</div>
              </div>
            ) : (
              <div className="space-y-2.5 pt-1 flex-1 min-h-[140px] flex flex-col">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 px-0.5 flex items-center justify-between shrink-0">
                  <span>{t("manageGroupSheet.membersSection")}</span>
                  <span className="text-[11px] font-normal lowercase">({members.length})</span>
                </div>
                <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-[100px]">
                  {members.map((member: GroupMember) => {
                    const profile = membersProfiles?.find((p) => p.uid === member.userId);
                    const displayName = profile?.username || member.userId;
                    const initials = displayName.substring(0, 2).toUpperCase();

                    const canManage = canManageMember(member.role) && member.userId !== user?.uid;

                    return (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/60 hover:border-border shadow-2xs transition-all"
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
              </div>
            )}

            {currentUserRole === "owner" && (
              <div className="pt-4 border-t border-border/60 mt-auto shrink-0">
                <h4 className="text-xs font-bold uppercase tracking-wider text-destructive mb-2 px-0.5">
                  {t("manageGroupSheet.dangerZoneTitle")}
                </h4>
                <Button
                  variant="outline"
                  isBusy={deleteGroupMutation.isPending}
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive hover:text-white rounded-xl h-10 font-medium flex items-center justify-center gap-2 transition-colors"
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

export default ManageGroupSheet;


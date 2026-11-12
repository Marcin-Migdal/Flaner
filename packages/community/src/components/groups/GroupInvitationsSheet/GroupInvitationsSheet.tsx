import { Avatar, Badge, Button, Sheet, SheetTrigger, SidePanel } from "@flaner/ui-components";
import { Check, Loader2, Mail, X } from "lucide-react";
import { useAuth } from "@flaner/shared/context";
import { useCommunityTranslations } from "../../../hooks/useCommunityTranslations";
import { useSheet } from "@flaner/shared/hooks";
import { useState } from "react";
import { useAcceptGroupInvitationMutation, useGetUserGroupInvitationsQuery, useGetUsersQuery, useRejectGroupInvitationMutation } from "../../../hooks";

export function GroupInvitationsSheet() {
  const { t } = useCommunityTranslations();
  const { user } = useAuth();
  const [open, { setOpen }] = useSheet({ hashTarget: "#group-invitations" });
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: invitations = [], isLoading } = useGetUserGroupInvitationsQuery(user?.uid);
  const acceptMutation = useAcceptGroupInvitationMutation();
  const rejectMutation = useRejectGroupInvitationMutation();

  // We need to fetch profiles of the invitors
  const invitorIds = [...new Set(invitations.map(i => i.invitedByUserId))];
  const { data: invitorProfiles } = useGetUsersQuery(invitorIds.length > 0 ? invitorIds : []);

  if (invitations.length === 0) {
    return null;
  }

  const handleAccept = async (groupId: string) => {
    if (!user || processingId) return;
    setProcessingId(`accept-${groupId}`);
    try {
      await acceptMutation.mutateAsync({ groupId, userId: user.uid });
      if (invitations.length === 1) setOpen(false); // Close if it was the last one
    } catch {
      // Handled globally
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (groupId: string) => {
    if (!user || processingId) return;
    setProcessingId(`reject-${groupId}`);
    try {
      await rejectMutation.mutateAsync({ groupId, userId: user.uid });
      if (invitations.length === 1) setOpen(false); // Close if it was the last one
    } catch {
      // Handled globally
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="relative size-12 shrink-0 rounded-2xl"
          aria-label={t("groupInvitations.title")}
        >
          <Mail className="size-5" />
          {invitations.length > 0 && (
            <Badge
              shape="count"
              size="sm"
              variant="solid-danger"
              className="absolute -top-1 -right-1 ring-2 ring-background animate-pulse"
            >
              {invitations.length > 99 ? "99+" : invitations.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SidePanel title={t("groupInvitations.title")} description={t("groupInvitations.desc")}>
        {isLoading ? (
          <div className="flex justify-center items-center py-8 text-muted-foreground gap-2">
            <Loader2 className="size-4 animate-spin text-brand-text" />
            <span>{t("groupInvitations.loading")}</span>
          </div>
        ) : (
          <div className="space-y-3">
            {invitations.map((inv) => {
              const invitor = invitorProfiles?.find(p => p.uid === inv.invitedByUserId);
              const invitorName = invitor?.username || t("groupInvitations.someone");
              const isAccepting = processingId === `accept-${inv.groupId}`;
              const isRejecting = processingId === `reject-${inv.groupId}`;
              const isBusy = !!processingId;
              
              return (
                <div key={inv.groupId} className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={inv.groupName}
                      src={inv.groupAvatarUrl}
                      className="size-12 border border-border shrink-0"
                      fallbackClassName="bg-brand/20 text-brand-text font-bold"
                    />
                    <div className="overflow-hidden">
                      <div className="font-semibold text-base truncate">{inv.groupName}</div>
                      <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        {t("groupInvitations.invitedBy")} <span className="font-medium text-foreground">{invitorName}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-1 mt-1 border-t border-border/50">
                    <Button
                      variant="primary"
                      className="flex-1 rounded-lg h-9"
                      disabled={isBusy}
                      isBusy={isAccepting}
                      onClick={() => handleAccept(inv.groupId)}
                    >
                      {isAccepting ? (
                        <span>{t("groupInvitations.joining")}</span>
                      ) : (
                        <>
                          <Check className="size-4" />
                          <span>{t("groupInvitations.accept")}</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1 rounded-lg h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={isBusy}
                      isBusy={isRejecting}
                      onClick={() => handleReject(inv.groupId)}
                    >
                      {isRejecting ? (
                        <span>{t("groupInvitations.rejecting")}</span>
                      ) : (
                        <>
                          <X className="size-4" />
                          <span>{t("groupInvitations.reject")}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SidePanel>
    </Sheet>
  );
}

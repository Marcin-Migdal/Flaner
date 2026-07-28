import { Avatar, AvatarFallback, AvatarImage, Button, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@flaner-v2/ui-components";
import { Check, Loader2, Mail, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@flaner-v2/shared";
import { useCommunityTranslations } from "../../hooks/useCommunityTranslations";
import { useAcceptGroupInvitationMutation, useGetUserGroupInvitationsQuery, useGetUsersQuery, useRejectGroupInvitationMutation } from "../../hooks";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

export function GroupInvitationsSheet() {
  const { t } = useCommunityTranslations();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.hash === "#group-invitations") {
      setOpen(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

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
      toast.success(t("groupInvitations.acceptSuccess"));
      if (invitations.length === 1) setOpen(false); // Close if it was the last one
    } catch (err: any) {
      toast.error(t("groupInvitations.acceptError"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (groupId: string) => {
    if (!user || processingId) return;
    setProcessingId(`reject-${groupId}`);
    try {
      await rejectMutation.mutateAsync({ groupId, userId: user.uid });
      toast.success(t("groupInvitations.rejectSuccess"));
      if (invitations.length === 1) setOpen(false); // Close if it was the last one
    } catch (err: any) {
      toast.error(t("groupInvitations.rejectError"));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" size="icon" className="relative size-12 shrink-0 rounded-2xl">
          <Mail className="size-5" />
          {invitations.length > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 min-w-5 px-1 flex items-center justify-center rounded-full ring-2 ring-background animate-pulse">
              {invitations.length > 99 ? "99+" : invitations.length}
            </div>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-6 bg-card/95 backdrop-blur-md border-l border-border flex flex-col h-full shadow-2xl">
        <SheetHeader className="p-0 border-b border-border pb-4">
          <SheetTitle className="text-xl font-bold font-heading">{t("groupInvitations.title")}</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground mt-1">
            {t("groupInvitations.desc")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 scrollbar-none">
          {isLoading ? (
            <div className="flex justify-center items-center py-8 text-muted-foreground gap-2">
              <Loader2 className="size-4 animate-spin text-brand" />
              <span>Ładowanie...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((inv) => {
                const invitor = invitorProfiles?.find(p => p.uid === inv.invitedByUserId);
                const invitorName = invitor?.username || "Ktoś";
                const isAccepting = processingId === `accept-${inv.groupId}`;
                const isRejecting = processingId === `reject-${inv.groupId}`;
                const isBusy = !!processingId;
                
                return (
                  <div key={inv.groupId} className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-12 border border-border shrink-0">
                        {inv.groupAvatarUrl && <AvatarImage src={inv.groupAvatarUrl} alt={inv.groupName} />}
                        <AvatarFallback className="bg-brand/20 text-brand font-bold">
                          {inv.groupName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
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
                        onClick={() => handleAccept(inv.groupId)}
                      >
                        {isAccepting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            <span>Dołączanie...</span>
                          </>
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
                        onClick={() => handleReject(inv.groupId)}
                      >
                        {isRejecting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            <span>Odrzucanie...</span>
                          </>
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
        </div>
      </SheetContent>
    </Sheet>
  );
}

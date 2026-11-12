import { Avatar, Badge, Button, ListItem, Separator, Sheet, SheetTrigger, SidePanel } from "@flaner/ui-components";
import { Inbox, Loader2, Send } from "lucide-react";
import {
  useAcceptFriendRequestMutation,
  useCancelFriendRequestMutation,
  useGetReceivedFriendRequestRealtimeQuery,
  useGetSentFriendRequestRealtimeQuery,
  useRejectFriendRequestMutation,
} from "../../hooks";
import { useCommunityTranslations } from "../../hooks/useCommunityTranslations";
import { useSheet } from "@flaner/shared/hooks";

export function InvitationsSheet() {
  const { t } = useCommunityTranslations();
  const [open, { setOpen }] = useSheet({ hashTarget: "#friend-requests" });

  // Queries
  const { data: receivedRequests = [], isLoading: loadingReceived } = useGetReceivedFriendRequestRealtimeQuery();
  const { data: sentRequests = [], isLoading: loadingSent } = useGetSentFriendRequestRealtimeQuery();

  // Mutations
  const acceptRequest = useAcceptFriendRequestMutation();
  const rejectRequest = useRejectFriendRequestMutation();
  const cancelRequest = useCancelFriendRequestMutation();

  const pendingCount = receivedRequests.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="relative size-10 sm:h-10 sm:w-auto px-0 sm:px-4 gap-2 font-medium border-border hover:bg-accent/50 rounded-xl transition-all flex items-center justify-center shrink-0"
          title={t("invitations.button")}
          aria-label={t("invitations.button")}
        >
          <Inbox className="size-4 shrink-0" />
          <span className="hidden sm:inline">{t("invitations.button")}</span>
          {pendingCount > 0 && (
            <Badge
              shape="count"
              size="sm"
              variant="solid-danger"
              className="absolute -top-1 -right-1 ring-2 ring-background animate-pulse"
            >
              {pendingCount > 99 ? "99+" : pendingCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SidePanel title={t("invitations.title")} description={t("invitations.desc")}>
        {/* Received Requests */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
            <Inbox className="size-4 text-brand-text" />
            {t("invitations.received")} ({receivedRequests.length})
          </h3>
          {loadingReceived ? (
            <div className="flex justify-center py-4">
              <Loader2 className="size-5 animate-spin text-brand-text" />
            </div>
          ) : receivedRequests.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2 pl-2">{t("invitations.emptyReceived")}</p>
          ) : (
            <div className="space-y-2">
              {receivedRequests.map((req) => {
                const isAccepting = acceptRequest.isPending && acceptRequest.variables?.uid === req.senderUid;
                const isRejecting = rejectRequest.isPending && rejectRequest.variables?.uid === req.senderUid;
                const sender = { uid: req.senderUid, username: req.senderUsername, avatarUrl: req.senderAvatarUrl };

                return (
                  <ListItem
                    key={req.id}
                    leading={<Avatar variant="brand" name={req.senderUsername} src={req.senderAvatarUrl} />}
                    title={req.senderUsername}
                    trailing={
                      <>
                        <Button
                          variant="brand"
                          isBusy={isAccepting}
                          disabled={isRejecting}
                          onClick={() => acceptRequest.mutate(sender)}
                        >
                          {t("invitations.accept")}
                        </Button>
                        <Button
                          variant="destructive"
                          isBusy={isRejecting}
                          disabled={isAccepting}
                          onClick={() => rejectRequest.mutate(sender)}
                        >
                          {t("invitations.reject")}
                        </Button>
                      </>
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        <Separator className="bg-border/60" />

        {/* Sent Requests */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
            <Send className="size-4 text-brand-text" />
            {t("invitations.sent")} ({sentRequests.length})
          </h3>
          {loadingSent ? (
            <div className="flex justify-center py-4">
              <Loader2 className="size-5 animate-spin text-brand-text" />
            </div>
          ) : sentRequests.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2 pl-2">{t("invitations.emptySent")}</p>
          ) : (
            <div className="space-y-2">
              {sentRequests.map((req) => {
                const isCanceling = cancelRequest.isPending && cancelRequest.variables === req.receiverUid;

                return (
                  <ListItem
                    key={req.id}
                    leading={<Avatar variant="brand" name={req.receiverUsername} src={req.receiverAvatarUrl} />}
                    title={req.receiverUsername}
                    trailing={
                      <Button
                        variant="outline"
                        isBusy={isCanceling}
                        onClick={() => cancelRequest.mutate(req.receiverUid)}
                        className="hover:border-danger/30 hover:bg-danger-subtle hover:text-danger-text"
                      >
                        {t("invitations.cancel")}
                      </Button>
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </SidePanel>
    </Sheet>
  );
}

export default InvitationsSheet;

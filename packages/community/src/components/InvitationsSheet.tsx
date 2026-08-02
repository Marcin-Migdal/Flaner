import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@flaner/ui-components";
import { Inbox, Loader2, Send } from "lucide-react";
import {
  useAcceptFriendRequestMutation,
  useCancelFriendRequestMutation,
  useGetReceivedFriendRequestRealtimeQuery,
  useGetSentFriendRequestRealtimeQuery,
  useRejectFriendRequestMutation,
} from "../hooks";
import { useCommunityTranslations } from "../hooks/useCommunityTranslations";
import { useSheet } from "@flaner/shared/hooks";
import { RequestItem } from "./common/RequestItem";

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

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.slice(0, 2).toUpperCase();
  };

  const pendingCount = receivedRequests.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="relative h-10 px-4 gap-2 font-medium border-border hover:bg-accent/50 rounded-xl transition-all"
        >
          <Inbox className="size-4" />
          <span>{t("invitations.button")}</span>
          {pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
              {pendingCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md p-6 bg-card/95 backdrop-blur-md border-l border-border flex flex-col h-full shadow-2xl">
        <SheetHeader className="p-0 border-b border-border pb-4">
          <SheetTitle className="text-xl font-bold font-heading">{t("invitations.title")}</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground mt-1">{t("invitations.desc")}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-1 scrollbar-none">
          {/* Received Requests */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
              <Inbox className="size-4 text-brand" />
              {t("invitations.received")} ({receivedRequests.length})
            </h3>
            {loadingReceived ? (
              <div className="flex justify-center py-4">
                <Loader2 className="size-5 animate-spin text-brand" />
              </div>
            ) : receivedRequests.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2 pl-2">{t("invitations.emptyReceived")}</p>
            ) : (
              <div className="space-y-2">
                {receivedRequests.map((req) => {
                  const isAccepting = acceptRequest.isPending && acceptRequest.variables?.uid === req.senderUid;
                  const isRejecting = rejectRequest.isPending && rejectRequest.variables?.uid === req.senderUid;

                  return (
                    <RequestItem
                      key={req.id}
                      username={req.senderUsername}
                      avatarUrl={req.senderAvatarUrl}
                      acceptLabel={t("invitations.accept")}
                      rejectLabel={t("invitations.reject")}
                      onAccept={() =>
                        acceptRequest.mutate({
                          uid: req.senderUid,
                          username: req.senderUsername,
                          avatarUrl: req.senderAvatarUrl,
                        })
                      }
                      onReject={() =>
                        rejectRequest.mutate({
                          uid: req.senderUid,
                          username: req.senderUsername,
                          avatarUrl: req.senderAvatarUrl,
                        })
                      }
                      isAccepting={isAccepting}
                      isRejecting={isRejecting}
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
              <Send className="size-4 text-brand" />
              {t("invitations.sent")} ({sentRequests.length})
            </h3>
            {loadingSent ? (
              <div className="flex justify-center py-4">
                <Loader2 className="size-5 animate-spin text-brand" />
              </div>
            ) : sentRequests.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2 pl-2">{t("invitations.emptySent")}</p>
            ) : (
              <div className="space-y-2">
                {sentRequests.map((req) => {
                  const isCanceling = cancelRequest.isPending && cancelRequest.variables === req.receiverUid;

                  return (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card/40 hover:bg-card/80 transition-all gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-10 border border-border">
                          <AvatarImage src={req.receiverAvatarUrl} alt={req.receiverUsername} />
                          <AvatarFallback className="bg-gradient-to-tr from-brand to-brand-dark text-zinc-950 font-bold text-sm">
                            {getInitials(req.receiverUsername)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm text-foreground/90 truncate">{req.receiverUsername}</span>
                      </div>

                      <Button
                        size="xs"
                        variant="outline"
                        disabled={isCanceling}
                        onClick={() => cancelRequest.mutate(req.receiverUid)}
                        className="h-8 rounded-lg px-3 shrink-0 text-xs border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                      >
                        {isCanceling ? <Loader2 className="size-3.5 animate-spin" /> : t("invitations.cancel")}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default InvitationsSheet;

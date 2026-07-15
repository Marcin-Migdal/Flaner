import { Avatar, AvatarFallback, AvatarImage, Button, Input, TabsContent } from "@flaner-v2/ui-components";
import { Loader2, Search, UserCheck, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { useAcceptFriendRequestMutation } from "../hooks/useAcceptFriendRequestMutation";
import { useCancelFriendRequestMutation } from "../hooks/useCancelFriendRequestMutation";
import { useCommunityTranslations } from "../hooks/useCommunityTranslations";
import { useGetFriendsListQuery } from "../hooks/useGetFriendsListQuery";
import { useGetReceivedFriendRequestQuery } from "../hooks/useGetReceivedFriendRequestQuery";
import { useGetSentFriendRequestQuery } from "../hooks/useGetSentFriendRequestQuery";
import { useSearchUsersQuery } from "../hooks/useSearchUsersQuery";
import { useSendFriendRequestMutation } from "../hooks/useSendFriendRequestMutation";

import { useDebounce } from "@flaner-v2/shared";

export function SearchTabContent() {
  const { t } = useCommunityTranslations();
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounce(searchText, 300);

  // Queries
  const { data: friends = [] } = useGetFriendsListQuery();
  const { data: sentRequests = [] } = useGetSentFriendRequestQuery();
  const { data: receivedRequests = [] } = useGetReceivedFriendRequestQuery();
  const { data: searchResults = [], isFetching: searchingUsers } = useSearchUsersQuery(debouncedSearch);

  // Mutations
  const sendRequest = useSendFriendRequestMutation();
  const cancelRequest = useCancelFriendRequestMutation();
  const acceptRequest = useAcceptFriendRequestMutation();

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.slice(0, 2).toUpperCase();
  };

  const isFriend = (uid: string) => friends.some((f) => f.uid === uid);
  const hasSentRequest = (uid: string) => sentRequests.some((r) => r.receiverUid === uid);
  const hasReceivedRequest = (uid: string) => receivedRequests.some((r) => r.senderUid === uid);

  return (
    <TabsContent value="search" className="space-y-3 outline-none">
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t("searchTab.placeholder")}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-10 h-10 rounded-xl bg-card/20 border-border"
        />
        {searchText && (
          <button
            onClick={() => setSearchText("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {searchingUsers ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-brand" />
        </div>
      ) : debouncedSearch && searchResults.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border/60 bg-card/10 rounded-2xl p-6">
          <Search className="size-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">{t("searchTab.empty")}</p>
        </div>
      ) : debouncedSearch ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {searchResults.map((match) => {
            const friendStatus = isFriend(match.uid);
            const sentStatus = hasSentRequest(match.uid);
            const receivedStatus = hasReceivedRequest(match.uid);

            const isSending = sendRequest.isPending && sendRequest.variables?.uid === match.uid;
            const isCanceling = cancelRequest.isPending && cancelRequest.variables === match.uid;
            const isAccepting = acceptRequest.isPending && acceptRequest.variables?.uid === match.uid;

            return (
              <div
                key={match.uid}
                className="flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-card/30 hover:bg-card/60 transition-all gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="size-11 border border-border shadow-sm">
                    <AvatarImage src={match.avatarUrl} alt={match.username} />
                    <AvatarFallback className="bg-gradient-to-tr from-brand to-brand-dark text-zinc-950 font-bold text-sm">
                      {getInitials(match.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <span className="font-semibold text-sm text-foreground/90 block truncate">{match.username}</span>
                    <span className="text-[10px] text-muted-foreground block truncate">{match.email}</span>
                  </div>
                </div>

                <div className="shrink-0">
                  {friendStatus ? (
                    <div className="flex items-center gap-1 text-emerald-500 font-medium text-xs px-3 py-1.5 bg-emerald-500/10 rounded-lg">
                      <UserCheck className="size-3.5" />
                      <span>{t("searchTab.isFriend")}</span>
                    </div>
                  ) : sentStatus ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isCanceling}
                      onClick={() => cancelRequest.mutate(match.uid)}
                      className="h-9 px-3 rounded-lg border-border text-xs gap-1.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                    >
                      {isCanceling ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <>
                          <X className="size-3.5" />
                          <span>{t("searchTab.cancel")}</span>
                        </>
                      )}
                    </Button>
                  ) : receivedStatus ? (
                    <Button
                      size="sm"
                      variant="brand"
                      disabled={isAccepting}
                      onClick={() =>
                        acceptRequest.mutate({
                          uid: match.uid,
                          username: match.username,
                          avatarUrl: match.avatarUrl,
                        })
                      }
                      className="h-9 px-3 rounded-lg text-xs gap-1.5"
                    >
                      {isAccepting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <>
                          <UserCheck className="size-3.5" />
                          <span>{t("searchTab.accept")}</span>
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSending}
                      onClick={() =>
                        sendRequest.mutate({
                          uid: match.uid,
                          username: match.username,
                          avatarUrl: match.avatarUrl,
                        })
                      }
                      className="h-9 px-3 rounded-lg border-border text-xs gap-1.5 hover:bg-brand/10 hover:border-brand/30 hover:text-brand"
                    >
                      {isSending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="size-3.5" />
                          <span>{t("searchTab.add")}</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border/60 bg-card/10 rounded-2xl p-6">
          <Search className="size-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">{t("search")}</p>
        </div>
      )}
    </TabsContent>
  );
}

export default SearchTabContent;

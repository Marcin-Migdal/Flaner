import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  ConfirmationPopup,
  Input,
  TabsContent,
} from "@flaner-v2/ui-components";
import { Loader2, Search, UserMinus, Users, X } from "lucide-react";
import { useState } from "react";
import { useGetFriendsListRealtimeQuery, useGetUsersQuery, useRemoveFriendMutation } from "../hooks";
import { useCommunityTranslations } from "../hooks/useCommunityTranslations";

export function FriendsTabContent() {
  const { t } = useCommunityTranslations();
  const [filterQuery, setFilterQuery] = useState("");
  const [friendToRemove, setFriendToRemove] = useState<{ uid: string; username: string } | null>(null);

  const { data: friends = [], isLoading: loadingFriends } = useGetFriendsListRealtimeQuery();
  const friendUids = friends.map((f) => f.uid);
  const { data: friendProfiles = [] } = useGetUsersQuery(friendUids);

  const deleteFriend = useRemoveFriendMutation();

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.slice(0, 2).toUpperCase();
  };

  const handleConfirmRemove = async () => {
    if (!friendToRemove) return;
    try {
      await deleteFriend.mutateAsync(friendToRemove.uid);
      setFriendToRemove(null);
    } catch (err) {
      // Handled by mutation / global toast
    }
  };

  const filteredFriends = friends.filter((friend) => friend.username.toLowerCase().includes(filterQuery.toLowerCase()));

  return (
    <TabsContent value="friends" className="space-y-3 outline-none">
      {/* Local filter input (always rendered to prevent layout shifts) */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t("friendsList.placeholder")}
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          disabled={friends.length === 0}
          className="pl-10 h-10 rounded-xl bg-card/20 border-border"
        />
        {filterQuery && (
          <button
            onClick={() => setFilterQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {loadingFriends ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-brand" />
        </div>
      ) : filteredFriends.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border/60 bg-card/10 rounded-2xl p-6">
          <Users className="size-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground max-w-xs">
            {filterQuery ? t("searchTab.empty") : t("friendsList.empty")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFriends.map((friend) => {
            const isDeleting = deleteFriend.isPending && deleteFriend.variables === friend.uid;
            const profile = friendProfiles.find((p) => p.uid === friend.uid);
            const avatarUrl = profile?.avatarUrl || friend.avatarUrl;

            return (
              <div
                key={friend.uid}
                className="flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-card/30 hover:bg-card/60 transition-all gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="size-11 border border-border shadow-sm">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={friend.username} />}
                    <AvatarFallback className="bg-gradient-to-tr from-brand to-brand-dark text-zinc-950 font-bold text-sm">
                      {getInitials(friend.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <span className="font-semibold text-sm text-foreground/90 block truncate">{friend.username}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {t("friendsList.addedAt", { date: new Date(friend.createdAt).toLocaleDateString() })}
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={isDeleting}
                  onClick={() => setFriendToRemove({ uid: friend.uid, username: friend.username })}
                  className="h-9 px-3 rounded-lg border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-xs gap-1.5"
                >
                  {isDeleting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <>
                      <UserMinus className="size-3.5" />
                      <span>{t("friendsList.remove")}</span>
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmationPopup
        open={!!friendToRemove}
        onOpenChange={(isOpen) => !isOpen && setFriendToRemove(null)}
        title={t("friendsList.removeConfirmTitle")}
        description={t("friendsList.removeConfirmDesc", { name: friendToRemove?.username || "" })}
        confirmLabel={t("friendsList.removeConfirmBtn")}
        cancelLabel={t("groupDetails.cancelBtn")}
        variant="destructive"
        isConfirming={deleteFriend.isPending}
        onConfirm={handleConfirmRemove}
      />
    </TabsContent>
  );
}

export default FriendsTabContent;

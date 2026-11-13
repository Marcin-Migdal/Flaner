import {
  Avatar,
  Button,
  Card,
  ConfirmationPopup,
  EmptyState,
  Input,
  ListItem,
  Skeleton,
  TabsContent,
} from "@flaner/ui-components";
import { cn } from "@flaner/shared/utils";
import { Search, UserMinus, Users, X } from "lucide-react";
import { useState } from "react";
import { useGetFriendsListRealtimeQuery, useGetUsersRealtimeQuery, useRemoveFriendMutation } from "../../hooks";
import { useCommunityTranslations } from "../../hooks/useCommunityTranslations";
import { friendsTabContentStyles as styles } from "./FriendsTabContent.styles";

export function FriendsTabContent() {
  const { t } = useCommunityTranslations();
  const [filterQuery, setFilterQuery] = useState("");
  const [friendToRemove, setFriendToRemove] = useState<{ uid: string; username: string } | null>(null);

  const { data: friends = [], isLoading: loadingFriends } = useGetFriendsListRealtimeQuery();
  const friendUids = friends.map((f) => f.uid);
  const { data: friendProfiles = [], isLoading: loadingProfiles } = useGetUsersRealtimeQuery(friendUids);

  // Name and avatar come from the live profile; no profile means the account was deleted
  const rows = friends.map((friend) => {
    const profile = friendProfiles.find((p) => p.uid === friend.uid);
    return {
      ...friend,
      isDeleted: !profile,
      username: profile?.username ?? t("friendsList.deletedAccount"),
      avatarUrl: profile?.avatarUrl,
    };
  });

  const deleteFriend = useRemoveFriendMutation();

  const handleConfirmRemove = async () => {
    if (!friendToRemove) return;
    try {
      await deleteFriend.mutateAsync(friendToRemove.uid);
      setFriendToRemove(null);
    } catch {
      // Handled by mutation / global toast
    }
  };

  const filteredFriends = rows.filter((friend) => friend.username.toLowerCase().includes(filterQuery.toLowerCase()));

  return (
    <TabsContent value="friends" className={styles.root}>
      {/* Local filter input (always rendered to prevent layout shifts) */}
      <div className={styles.filter}>
        <Search className={styles.filterIcon} />
        <Input
          type="text"
          placeholder={t("friendsList.placeholder")}
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          disabled={friends.length === 0}
          className={styles.filterInput}
        />
        {filterQuery && (
          <button onClick={() => setFilterQuery("")} className={styles.clearButton}>
            <X className="size-4" />
          </button>
        )}
      </div>

      {loadingFriends || loadingProfiles ? (
        <Card variant="subtle" padding="sm" aria-busy="true">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className={styles.skeletonRow} />
          ))}
        </Card>
      ) : filteredFriends.length === 0 ? (
        <EmptyState variant="card" icon={<Users />} title={filterQuery ? t("searchTab.empty") : t("friendsList.empty")} />
      ) : (
        <Card variant="subtle" padding="sm">
          <ul className={styles.list}>
            {filteredFriends.map((friend) => (
              <li key={friend.uid}>
                <ListItem
                  className={styles.row}
                  leading={
                    <Avatar variant="brand" name={friend.username} src={friend.avatarUrl} className={styles.avatar} />
                  }
                  title={<span className={cn(friend.isDeleted && styles.deletedName)}>{friend.username}</span>}
                  description={t("friendsList.addedAt", { date: new Date(friend.createdAt).toLocaleDateString() })}
                  trailing={
                    <Button
                      variant="outline"
                      size="lg"
                      isBusy={deleteFriend.isPending && deleteFriend.variables === friend.uid}
                      onClick={() => setFriendToRemove({ uid: friend.uid, username: friend.username })}
                      className={styles.removeButton}
                    >
                      <UserMinus />
                      <span>{t("friendsList.remove")}</span>
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
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

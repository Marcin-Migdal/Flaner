import { useAuth } from "@flaner/shared/context";
import { useDebounce } from "@flaner/shared/hooks";
import { Avatar, AvatarFallback, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input } from "@flaner/ui-components";
import { Check, Clock, Loader2, Search, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { useCommunityTranslations } from "../../hooks/useCommunityTranslations";
import { useGetFriendsListQuery, useGetGroupMembersQuery, useGetGroupPendingInvitationsQuery, useInviteUserToGroupMutation, useSearchUsersQuery } from "../../hooks";

export function InviteToGroupModal({
  groupId,
  groupName,
  groupAvatarUrl,
  open,
  onOpenChange,
}: {
  groupId: string;
  groupName: string;
  groupAvatarUrl?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useCommunityTranslations();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const { data: friends = [], isLoading: friendsLoading } = useGetFriendsListQuery();
  const { data: searchResults = [], isFetching: usersSearching } = useSearchUsersQuery(debouncedSearch);
  const { data: members = [], isLoading: membersLoading } = useGetGroupMembersQuery(groupId);
  const { data: pendingInvitations = [], isLoading: invitationsLoading } = useGetGroupPendingInvitationsQuery(groupId);
  
  const inviteMutation = useInviteUserToGroupMutation();

  const isSearching = !!debouncedSearch.trim();
  const displayedUsers = isSearching ? searchResults : friends;
  const isLoading = isSearching
    ? usersSearching || membersLoading || invitationsLoading
    : friendsLoading || membersLoading || invitationsLoading;

  const handleInvite = async (targetUserId: string) => {
    if (!user || invitingId) return;
    setInvitingId(targetUserId);
    try {
      await inviteMutation.mutateAsync({
        groupId,
        groupName,
        groupAvatarUrl,
        userId: targetUserId,
        invitedByUserId: user.uid,
      });
    } catch {
      // Handled globally
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-border/60 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-2xl bg-gradient-to-tr from-brand/20 via-brand/10 to-transparent border border-brand/20 flex items-center justify-center text-brand shadow-inner shrink-0">
              <UserPlus className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-extrabold font-heading tracking-tight text-foreground">
                {t("inviteToGroup.title")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {t("inviteToGroup.desc")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-3">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t("inviteToGroup.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 h-11 bg-muted/50 hover:bg-muted/80 focus-visible:bg-background border-border/50 focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/20 rounded-2xl text-sm transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2 border-t border-border/40 scrollbar-none">
          {isLoading ? (
            <div className="flex justify-center items-center py-12 text-muted-foreground text-sm gap-2.5 font-medium">
              <Loader2 className="size-5 animate-spin text-brand" />
              <span>{t("inviteToGroup.loading")}</span>
            </div>
          ) : displayedUsers.length > 0 ? (
            displayedUsers.map((targetUser) => {
              const isMember = members.some((m) => m.userId === targetUser.uid);
              const isInvited = pendingInvitations.some((i) => i.userId === targetUser.uid);
              const isCurrentlyInviting = invitingId === targetUser.uid;
              const initials = targetUser.username ? targetUser.username.substring(0, 2).toUpperCase() : "??";

              return (
                <div key={targetUser.uid} className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/40 transition-all duration-200 border border-transparent hover:border-border/50 group">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 border border-border/60 shadow-sm">
                      <AvatarFallback className="bg-gradient-to-tr from-brand to-brand-dark text-zinc-950 font-bold text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-foreground group-hover:text-brand transition-colors">
                        {targetUser.username}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isMember || isInvited ? "secondary" : "brand"}
                    disabled={isMember || isInvited || !!invitingId}
                    onClick={() => handleInvite(targetUser.uid)}
                    className="rounded-full px-4 h-8 text-xs font-semibold shadow-sm"
                  >
                    {isCurrentlyInviting ? (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        <span>{t("inviteToGroup.sending")}</span>
                      </>
                    ) : isMember ? (
                      <>
                        <Check className="size-3 text-muted-foreground" />
                        <span>{t("inviteToGroup.alreadyMember")}</span>
                      </>
                    ) : isInvited ? (
                      <>
                        <Clock className="size-3 text-amber-500" />
                        <span>{t("inviteToGroup.invitedBtn")}</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="size-3" />
                        <span>{t("inviteToGroup.inviteBtn")}</span>
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="size-14 rounded-3xl bg-muted/40 border border-border/50 flex items-center justify-center text-muted-foreground mb-3 shadow-sm">
                <Search className="size-6 text-muted-foreground/50" />
              </div>
              <h4 className="text-sm font-semibold text-foreground mb-1">
                {t("inviteToGroup.emptyTitle")}
              </h4>
              <p className="text-xs text-muted-foreground max-w-[220px]">
                {t("inviteToGroup.empty")}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


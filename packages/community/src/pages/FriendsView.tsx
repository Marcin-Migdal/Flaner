import { Tabs, TabsList, TabsTrigger } from "@flaner-v2/ui-components";
import { Users } from "lucide-react";
import { useCommunityTranslations } from "../hooks/useCommunityTranslations";
import { useGetFriendsListQuery } from "../hooks/useGetFriendsListQuery";
import { FriendsTabContent } from "../components/FriendsTabContent";
import { InvitationsSheet } from "../components/InvitationsSheet";
import { SearchTabContent } from "../components/SearchTabContent";

export function FriendsView() {
  console.log("[FriendsView] rendering component...");
  const { t } = useCommunityTranslations();
  const { data: friends = [] } = useGetFriendsListQuery();

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand/10 text-brand rounded-xl">
            <Users className="size-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground font-heading">{t("title")}</h1>
          </div>
        </div>

        {/* Sheet flyout for invitations */}
        <InvitationsSheet />
      </div>

      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md h-10 group-data-horizontal/tabs:h-10 bg-muted/40 border border-border/50 p-1 rounded-xl mb-1">
          <TabsTrigger value="friends" className="rounded-lg h-7 font-medium text-sm transition-all">
            {t("tabs.friendsList")} ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="search" className="rounded-lg h-7 font-medium text-sm transition-all">
            {t("tabs.searchUsers")}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Friends List */}
        <FriendsTabContent />

        {/* Tab 2: User Search */}
        <SearchTabContent />
      </Tabs>
    </div>
  );
}

export default FriendsView;

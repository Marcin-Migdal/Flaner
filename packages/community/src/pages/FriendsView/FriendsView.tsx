import { PageHeader, Tabs, TabsList, TabsTrigger } from "@flaner/ui-components";
import { Users } from "lucide-react";
import { useCommunityTranslations } from "../../hooks/useCommunityTranslations";
import { useGetFriendsListRealtimeQuery } from "../../hooks";
import { FriendsTabContent } from "../../components/FriendsTabContent";
import { InvitationsSheet } from "../../components/InvitationsSheet";
import { SearchTabContent } from "../../components/SearchTabContent";

export function FriendsView() {
  const { t } = useCommunityTranslations();
  const { data: friends = [] } = useGetFriendsListRealtimeQuery();

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6 px-4 md:px-0">
      {/* Header bar */}
      <PageHeader icon={<Users />} title={t("friends")} actions={<InvitationsSheet />} />

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

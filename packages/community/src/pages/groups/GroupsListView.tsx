import { useDebounce } from "@flaner/shared/hooks";
import { Button, GroupSearchResultItem, IconTextField, SearchBar } from "@flaner/ui-components";
import { Filter, Plus, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import type { Group } from '../../api/groups';
import { CreateGroupModal } from "../../components/CreateGroupModal";
import { GroupCard } from "../../components/groups/GroupCard";
import { GroupInvitationsSheet } from "../../components/groups/GroupInvitationsSheet";
import { useGetUserGroupsQuery, useSearchGlobalGroupsQuery } from "../../hooks";
import { useCommunityTranslations } from "../../hooks/useCommunityTranslations";

export function GroupsListView() {
  const { t } = useCommunityTranslations();
  const navigate = useNavigate();

  // User's own groups
  const { data: myGroups = [], isLoading: isLoadingMyGroups } = useGetUserGroupsQuery();

  // Search state for global groups
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Search state for user's own groups
  const [myGroupsSearchQuery, setMyGroupsSearchQuery] = useState("");

  const {
    data: searchData,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error: searchError,
  } = useSearchGlobalGroupsQuery(debouncedSearch);

  useEffect(() => {
    if (searchError) {
      console.error("Search error:", searchError);
      toast.error(`Błąd wyszukiwania: ${searchError.message}`);
    }
  }, [searchError]);

  const globalGroups = searchData?.pages.flatMap((page) => page.groups) ?? [];

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredMyGroups = myGroups.filter((g) => g.name.toLowerCase().includes(myGroupsSearchQuery.toLowerCase()));

  const handleGroupSelect = async (group: Group) => {
    navigate(`/community/groups/${group.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8 px-4 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand/10 text-brand rounded-xl">
            <Users className="size-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground font-heading">{t("groupsView.title")}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <IconTextField
            icon={<Filter className="size-4" />}
            size="lg"
            value={myGroupsSearchQuery}
            onChange={(e) => setMyGroupsSearchQuery(e.target.value)}
            placeholder={t("groupsView.filterPlaceholder")}
            isClearable
            onClear={() => setMyGroupsSearchQuery("")}
          />
          <SearchBar
            icon={<Search className="size-4" />}
            size="lg"
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
            placeholder={t("groupsView.searchPlaceholder")}
            isClearable
            onClear={() => setSearchQuery("")}
            onClose={() => setSearchQuery("")}
            results={globalGroups}
            isLoading={isFetching && !isFetchingNextPage}
            hasMore={hasNextPage}
            onShowMore={() => fetchNextPage()}
            isFetchingNextPage={isFetchingNextPage}
            renderResult={(group) => (
              <GroupSearchResultItem
                avatarUrl={group.avatarUrl}
                name={group.name}
                requiresApproval={group.requiresApproval}
              />
            )}
            onSelect={handleGroupSelect}
            alwaysOpen={false}
          />
          <GroupInvitationsSheet />
          <Button size="lg" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="size-4" />
            {t("groupsView.createBtn")}
          </Button>
        </div>
      </div>

      {isLoadingMyGroups ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-muted/30 animate-pulse rounded-2xl border border-border/50" />
          ))}
        </div>
      ) : filteredMyGroups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMyGroups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/50 rounded-3xl bg-muted/10">
          <div className="size-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Users className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{t("groupsView.emptyState.title")}</h3>
          <p className="text-muted-foreground max-w-sm mb-6">{t("groupsView.emptyState.desc")}</p>
          <Button variant="outline" className="rounded-xl" onClick={() => setIsCreateModalOpen(true)}>
            {t("groupsView.emptyState.actionBtn")}
          </Button>
        </div>
      )}

      <CreateGroupModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
    </div>
  );
}

export default GroupsListView;

import { useAuth } from "@flaner/shared/context";
import { useDebounce } from "@flaner/shared/hooks";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SearchBar,
} from "@flaner/ui-components";
import { Search, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import type { SplitGroup } from "../../../../../../api/splits";
import type { UserParticipant } from "../../../../../../api/participants";
import { useAddParticipantToGroupMutation } from "../../../../../../hooks/api/mutation";
import { useSearchParticipantsQuery } from "../../../../../../hooks/api/query";
import { usePlanningTranslations } from "../../../../../../hooks/usePlanningTranslations";
import { quickAddParticipantPopoverStyles as styles } from "./QuickAddParticipantPopover.styles";

export type QuickAddParticipantPopoverProps = {
  group: SplitGroup;
};

export const QuickAddParticipantPopover = ({ group }: QuickAddParticipantPopoverProps) => {
  const { t } = usePlanningTranslations();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: searchResults = [], isLoading } = useSearchParticipantsQuery(debouncedQuery, user?.uid);
  const { mutate: addParticipant, isPending } = useAddParticipantToGroupMutation();

  const userResults = useMemo(
    () =>
      searchResults.filter(
        (result): result is UserParticipant => result.type === "user" && !group.participants.includes(result.id),
      ),
    [searchResults, group.participants],
  );

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) setSearchQuery("");
  };

  const handleSelect = (participant: UserParticipant) => {
    addParticipant(
      { groupId: group.id, participantId: participant.id },
      { onSuccess: () => handleOpenChange(false) },
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={styles.trigger}
          title={t("splits.dashboard.addParticipant")}
          aria-label={t("splits.dashboard.addParticipant")}
        >
          <UserPlus className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className={styles.content}>
        <span className={styles.title}>{t("splits.dashboard.addParticipant")}</span>
        <SearchBar<UserParticipant>
          alwaysOpen
          icon={<Search className="size-4" />}
          placeholder={t("splits.dashboard.searchUsers")}
          value={searchQuery}
          onChange={setSearchQuery}
          results={userResults}
          isLoading={isLoading || isPending}
          onSelect={handleSelect}
          renderResult={(item) => (
            <div className={styles.resultRow}>
              <Avatar className={styles.resultAvatar}>
                <AvatarImage src={item.avatarUrl} />
                <AvatarFallback className={styles.resultAvatarFallback}>{item.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className={styles.resultName}>{item.name}</span>
            </div>
          )}
        />
      </PopoverContent>
    </Popover>
  );
};

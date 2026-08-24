import { useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Search, User, Users, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage, SearchBar } from "@flaner/ui-components";
import { useAuth } from "@flaner/shared/context";
import type { UserType } from "@flaner/shared/types";
import { getGroupMembersAsParticipants, type ParticipantResult } from "../../../api/participants";
import { useGetEventParticipantsProfilesQuery, useSearchParticipantsQuery } from "../../../hooks/api/query";
import { usePlanningTranslations } from "../../../hooks/usePlanningTranslations";
import type { CreateSchedulerFormData } from "../../../utils/schemas/create-scheduler-schema";

const getDefaultParticipant = (user: UserType | null): ParticipantResult[] => {
  if (!user) return [];
  return [
    {
      type: "user",
      id: user.uid,
      name: user.username,
      username: user.username,
      usernameLower: user.usernameLower,
      avatarUrl: user.avatarUrl,
    },
  ];
};

export type ParticipantSelectProps = {
  creatorId?: string;
  initialParticipantIds?: string[];
};

export const ParticipantSelect = ({
  creatorId,
  initialParticipantIds = [],
}: ParticipantSelectProps) => {
  const { t } = usePlanningTranslations();
  const { user } = useAuth();
  const { control, getValues, setValue } = useFormContext<CreateSchedulerFormData>();

  const [searchQuery, setSearchQuery] = useState("");
  const [addedProfilesMap, setAddedProfilesMap] = useState<Map<string, ParticipantResult>>(new Map());

  const { data: searchResults = [], isLoading: isSearchLoading } = useSearchParticipantsQuery(
    searchQuery,
    user?.uid,
  );

  const { data: fetchedProfilesMap = new Map<string, ParticipantResult>() } = useGetEventParticipantsProfilesQuery(
    initialParticipantIds,
    {
      select: (profiles) => {
        const map = new Map<string, ParticipantResult>();
        profiles.forEach(({ id, name, avatarUrl }) => {
          map.set(id, { type: "user", id, name, username: name, usernameLower: name.toLowerCase(), avatarUrl });
        });
        return map;
      },
    },
  );

  const rawParticipantIds = useWatch({ control, name: "participants" });

  const selectedProfilesMap = useMemo(() => {
    const defaultPart = getDefaultParticipant(user);
    const defaultMap = new Map(defaultPart.map((p) => [p.id, p]));
    const merged = new Map<string, ParticipantResult>();

    defaultMap.forEach((val, key) => merged.set(key, val));
    fetchedProfilesMap.forEach((val, key) => {
      if (!merged.has(key)) merged.set(key, val);
    });
    addedProfilesMap.forEach((val, key) => {
      merged.set(key, val);
    });

    return merged;
  }, [user, fetchedProfilesMap, addedProfilesMap]);

  const selectedParticipants: ParticipantResult[] = useMemo(() => {
    const participantIds = rawParticipantIds || [];
    return participantIds.map((id) => selectedProfilesMap.get(id)).filter((p): p is ParticipantResult => !!p);
  }, [rawParticipantIds, selectedProfilesMap]);

  const effectiveCreatorId = creatorId || user?.uid;

  const handleSelect = async (item: ParticipantResult) => {
    const current = getValues("participants") || [];

    if (item.type === "group") {
      const members = await getGroupMembersAsParticipants(item.id, item.name);
      setAddedProfilesMap((prev) => {
        const next = new Map(prev);
        members.forEach((m) => {
          if (!current.includes(m.id) && m.id !== user?.uid) {
            next.set(m.id, m);
          }
        });
        return next;
      });

      const newIds = members.map((m) => m.id).filter((id) => !current.includes(id));
      setValue("participants", [...current, ...newIds]);
    } else {
      setAddedProfilesMap((prev) => {
        if (current.includes(item.id)) return prev;
        const next = new Map(prev);
        next.set(item.id, item);
        return next;
      });

      if (!current.includes(item.id)) {
        setValue("participants", [...current, item.id]);
      }
    }
    setSearchQuery("");
  };

  const handleRemoveParticipant = (id: string) => {
    setAddedProfilesMap((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    const current = getValues("participants") || [];
    setValue(
      "participants",
      current.filter((pId) => pId !== id),
    );
  };

  return (
    <div className="space-y-4 flex flex-col flex-1">
      <h3 className="font-semibold text-sm">{t("create.participants")}</h3>
      <div className="flex flex-col gap-3">
        <SearchBar<ParticipantResult>
          alwaysOpen
          icon={<Search className="h-4 w-4" />}
          placeholder={t("create.searchFriends")}
          value={searchQuery}
          onChange={setSearchQuery}
          results={searchResults}
          isLoading={isSearchLoading}
          onSelect={handleSelect}
          renderResult={(item) => (
            <div className="flex items-center gap-3">
              <Avatar className="size-8 shrink-0">
                <AvatarImage src={item.avatarUrl} />
                <AvatarFallback className="text-xs font-semibold">
                  {item.type === "group" ? (
                    <Users className="size-4 text-muted-foreground" />
                  ) : (
                    item.name?.[0]?.toUpperCase() || <User className="size-4 text-muted-foreground" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{item.name}</span>
                <span className="text-xs text-muted-foreground">
                  {item.type === "group" ? t("create.resultGroup") : t("create.resultUser")}
                </span>
              </div>
            </div>
          )}
        />

        {selectedParticipants.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedParticipants.map((p) => {
              const isCreator = p.id === effectiveCreatorId;

              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 bg-muted/50 pl-1.5 pr-3 py-1 rounded-full text-sm border border-border/50 max-w-[260px]"
                >
                  <Avatar className="size-6 shrink-0">
                    <AvatarImage src={p.avatarUrl} />
                    <AvatarFallback className="text-[10px] font-semibold">
                      {p.type === "group" ? (
                        <Users className="size-3 text-muted-foreground" />
                      ) : (
                        p.name?.[0]?.toUpperCase() || "?"
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="truncate flex-1 min-w-0">
                    <span>{p.name}</span>
                    {isCreator && <span className="text-muted-foreground ml-1">({t("roles.creator")})</span>}
                    {p.type === "user" && p.groupName && !isCreator && (
                      <span className="text-muted-foreground ml-1">({p.groupName})</span>
                    )}
                  </div>
                  {!isCreator && (
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(p.id)}
                      className="hover:bg-accent shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

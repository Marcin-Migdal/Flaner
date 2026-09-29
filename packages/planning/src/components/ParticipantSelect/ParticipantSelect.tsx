import { useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Search, User, Users, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage, SearchBar } from "@flaner/ui-components";
import { useAuth } from "@flaner/shared/context";
import type { UserType } from "@flaner/shared/types";
import { getGroupMembersAsParticipants, type ParticipantResult } from "../../api/participants";
import { useGetEventParticipantsProfilesQuery, useSearchParticipantsQuery } from "../../hooks/api/query";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { participantSelectStyles as styles } from "./ParticipantSelect.styles";

type ParticipantsFormValues = {
  participants: string[];
};

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
  label?: string;
  searchPlaceholder?: string;
};

/**
 * Participant picker bound to the `participants: string[]` field of the surrounding form.
 * Selecting a community group adds all of its members.
 */
export const ParticipantSelect = ({
  creatorId,
  initialParticipantIds = [],
  label,
  searchPlaceholder,
}: ParticipantSelectProps) => {
  const { t } = usePlanningTranslations();
  const { user } = useAuth();
  const { control, getValues, setValue } = useFormContext<ParticipantsFormValues>();

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
      setValue("participants", [...current, ...newIds], { shouldValidate: true });
    } else {
      setAddedProfilesMap((prev) => {
        if (current.includes(item.id)) return prev;
        const next = new Map(prev);
        next.set(item.id, item);
        return next;
      });

      if (!current.includes(item.id)) {
        setValue("participants", [...current, item.id], { shouldValidate: true });
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
      { shouldValidate: true },
    );
  };

  return (
    <div className={styles.root}>
      <h3 className={styles.title}>{label ?? t("create.participants")}</h3>
      <div className={styles.body}>
        <SearchBar<ParticipantResult>
          alwaysOpen
          icon={<Search className="h-4 w-4" />}
          placeholder={searchPlaceholder ?? t("create.searchFriends")}
          value={searchQuery}
          onChange={setSearchQuery}
          results={searchResults}
          isLoading={isSearchLoading}
          onSelect={handleSelect}
          renderResult={(item) => (
            <div className={styles.resultRow}>
              <Avatar className={styles.resultAvatar}>
                <AvatarImage src={item.avatarUrl} />
                <AvatarFallback className={styles.resultAvatarFallback}>
                  {item.type === "group" ? (
                    <Users className={styles.resultIcon} />
                  ) : (
                    item.name?.[0]?.toUpperCase() || <User className={styles.resultIcon} />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className={styles.resultText}>
                <span className={styles.resultName}>{item.name}</span>
                <span className={styles.resultType}>
                  {item.type === "group" ? t("create.resultGroup") : t("create.resultUser")}
                </span>
              </div>
            </div>
          )}
        />

        {selectedParticipants.length > 0 && (
          <div className={styles.chips}>
            {selectedParticipants.map((p) => {
              const isCreator = p.id === effectiveCreatorId;

              return (
                <div key={p.id} className={styles.chip}>
                  <Avatar className={styles.chipAvatar}>
                    <AvatarImage src={p.avatarUrl} />
                    <AvatarFallback className={styles.chipAvatarFallback}>
                      {p.type === "group" ? <Users className={styles.chipIcon} /> : p.name?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className={styles.chipLabel}>
                    <span>{p.name}</span>
                    {isCreator && <span className={styles.chipMeta}>({t("roles.creator")})</span>}
                    {p.type === "user" && p.groupName && !isCreator && (
                      <span className={styles.chipMeta}>({p.groupName})</span>
                    )}
                  </div>
                  {!isCreator && (
                    <button type="button" onClick={() => handleRemoveParticipant(p.id)} className={styles.chipRemove}>
                      <X className={styles.chipRemoveIcon} />
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

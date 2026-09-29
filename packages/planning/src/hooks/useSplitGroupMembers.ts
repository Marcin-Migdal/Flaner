import { useAuth } from "@flaner/shared/context";
import { useCallback, useMemo } from "react";
import type { SplitGroup } from "../api/splits";
import type { ParticipantResult } from "../api/participants";
import { useGetEventParticipantsProfilesQuery } from "./api/query";
import { usePlanningTranslations } from "./usePlanningTranslations";

export type SplitGroupMember = {
  id: string;
  name: string;
  avatarUrl?: string;
  isCurrentUser: boolean;
};

/**
 * Resolves user profiles for the active participants of a split group (in the group's order)
 * and for former participants, so historical entries still show real names.
 */
export const useSplitGroupMembers = (group: SplitGroup | null) => {
  const { t } = usePlanningTranslations();
  const { user } = useAuth();

  const profileIds = useMemo(
    () => Array.from(new Set([...(group?.participants ?? []), ...(group?.formerParticipants ?? [])])),
    [group?.participants, group?.formerParticipants],
  );

  const { data: profiles = [], isLoading } = useGetEventParticipantsProfilesQuery(profileIds);

  const profilesById = useMemo(
    () => new Map<string, ParticipantResult>(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );

  const toMember = useCallback(
    (id: string): SplitGroupMember => {
      const profile = profilesById.get(id);
      return {
        id,
        name: profile?.name ?? t("splits.unknownUser"),
        avatarUrl: profile?.avatarUrl,
        isCurrentUser: id === user?.uid,
      };
    },
    [profilesById, t, user?.uid],
  );

  const members = useMemo(() => (group?.participants ?? []).map(toMember), [group?.participants, toMember]);

  const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  const getMember = useCallback((userId: string) => membersById.get(userId) ?? toMember(userId), [membersById, toMember]);

  const getMemberName = useCallback(
    (userId: string) => (userId === user?.uid ? t("splits.you") : getMember(userId).name),
    [getMember, t, user?.uid],
  );

  return { members, membersById, getMember, getMemberName, isLoading };
};

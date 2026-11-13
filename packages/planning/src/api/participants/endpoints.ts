// Firestore rules spec: .agents/skills/firestore-rules-manager/docs/groups.md (keep its Write flows / Queries in sync); profiles via `@flaner/shared/api` (users.md).
import { collection, collectionGroup, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { getUserProfiles, searchUserProfiles } from "@flaner/shared/api";
import { fb } from "@flaner/shared/firebase";
import type { UserProfile } from "@flaner/shared/types";
import { firestoreConverter } from "@flaner/shared/utils";
import type { ParticipantResult, UserParticipant, GroupParticipant } from "./types";

const refs = {
  // Lightweight type for search to avoid importing full domain models from other MFEs
  groups: () => collection(fb.firestore, "groups").withConverter(firestoreConverter<GroupParticipant>()),
};

const toUserParticipant = ({ uid, username, usernameLower, avatarUrl }: UserProfile): UserParticipant => ({
  type: "user",
  id: uid,
  name: username,
  username,
  usernameLower,
  avatarUrl,
});

export const searchParticipants = async (searchStr: string, currentUserId?: string): Promise<ParticipantResult[]> => {
  if (!searchStr.trim()) return [];
  const qLower = searchStr.toLowerCase();
  
  const publicGroupsQ = query(
    refs.groups(),
    where("type", "==", "public"),
    where("nameLower", ">=", qLower),
    where("nameLower", "<=", qLower + "\uf8ff"),
    limit(5)
  );

  const [profiles, publicGroupsSnap] = await Promise.all([searchUserProfiles(searchStr, 5), getDocs(publicGroupsQ)]);

  const users: ParticipantResult[] = profiles.map(toUserParticipant);

  const publicGroups: ParticipantResult[] = publicGroupsSnap.docs.map(d => {
    const data = d.data();
    const groupName = "name" in data && typeof data.name === "string" ? data.name : d.id;
    return { 
      type: "group", 
      id: d.id, 
      name: groupName, 
      avatarUrl: data.avatarUrl 
    };
  });

  let userPrivateGroups: ParticipantResult[] = [];
  if (currentUserId) {
    try {
      const userGroupsSnap = await getDocs(
        query(collectionGroup(fb.firestore, "members"), where("userId", "==", currentUserId))
      );
      const groupIds = userGroupsSnap.docs.flatMap(d => d.ref.parent.parent?.id ?? []);
      
      if (groupIds.length > 0) {
        const groupSnaps = await Promise.all(
          groupIds.slice(0, 10).map(gid => getDoc(doc(fb.firestore, "groups", gid)))
        );
        
        userPrivateGroups = groupSnaps
          .filter(snap => snap.exists())
          .map(snap => {
            const data = snap.data();
            const groupName = data && "name" in data && typeof data.name === "string" ? data.name : snap.id;
            return {
              type: "group" as const,
              id: snap.id,
              name: groupName,
              avatarUrl: data?.avatarUrl
            };
          })
          .filter(g => g.name.toLowerCase().includes(qLower));
      }
    } catch (err) {
      // Best effort: public results are still useful without the private groups
      reportError(err);
    }
  }

  const uniqueGroupsMap = new Map<string, ParticipantResult>();
  [...publicGroups, ...userPrivateGroups].forEach(g => {
    if (!uniqueGroupsMap.has(g.id)) {
      uniqueGroupsMap.set(g.id, g);
    }
  });
  const allGroups = Array.from(uniqueGroupsMap.values());

  const all = [...users, ...allGroups];
  return currentUserId ? all.filter(p => p.id !== currentUserId) : all;
};

export const getGroupMembersAsParticipants = async (groupId: string, groupName: string): Promise<ParticipantResult[]> => {
  const membersSnap = await getDocs(collection(fb.firestore, `groups/${groupId}/members`));
  const userIds = membersSnap.docs.map(d => d.data().userId || d.id);
  
  const profiles = await getUserProfiles(userIds);
  return profiles.map((profile) => ({ ...toUserParticipant(profile), groupName }));
};

export const getEventParticipantsProfiles = async (userIds: string[]): Promise<ParticipantResult[]> =>
  (await getUserProfiles(userIds)).map(toUserParticipant);

import { collection, collectionGroup, doc, documentId, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { fb } from "@flaner/shared/firebase";
import { firestoreConverter } from "@flaner/shared/utils";
import type { ParticipantResult, UserParticipant, GroupParticipant } from "./types";

const refs = {
  // Lightweight types for search to avoid importing full domain models from other MFEs
  users: () => collection(fb.firestore, "users").withConverter(firestoreConverter<UserParticipant>()),
  groups: () => collection(fb.firestore, "groups").withConverter(firestoreConverter<GroupParticipant>()),
};

const FIRESTORE_IN_LIMIT = 30;

export const searchParticipants = async (searchStr: string, currentUserId?: string): Promise<ParticipantResult[]> => {
  if (!searchStr.trim()) return [];
  const qLower = searchStr.toLowerCase();
  
  try {
    const usersQ = query(
      refs.users(),
      where("usernameLower", ">=", qLower),
      where("usernameLower", "<=", qLower + "\uf8ff"),
      limit(5)
    );
    
    const publicGroupsQ = query(
      refs.groups(),
      where("type", "==", "public"),
      where("nameLower", ">=", qLower),
      where("nameLower", "<=", qLower + "\uf8ff"),
      limit(5)
    );

    const [usersSnap, publicGroupsSnap] = await Promise.all([getDocs(usersQ), getDocs(publicGroupsQ)]);
    
    const users: ParticipantResult[] = usersSnap.docs.map(d => {
      const data = d.data();
      const username = data.username || (data as unknown as { name?: string }).name || d.id;
      return { 
        type: "user", 
        id: d.id, 
        name: username, 
        avatarUrl: data.avatarUrl, 
        username: username,
        usernameLower: data.usernameLower || username.toLowerCase()
      };
    });

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
        const groupIds = userGroupsSnap.docs.map(d => d.ref.parent.parent?.id).filter(Boolean) as string[];
        
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
        console.error("Failed to fetch private groups:", err);
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
  } catch (err) {
    console.error("Failed to search participants:", err);
    return [];
  }
};

export const getGroupMembersAsParticipants = async (groupId: string, groupName: string): Promise<ParticipantResult[]> => {
  try {
    const membersSnap = await getDocs(collection(fb.firestore, `groups/${groupId}/members`));
    const userIds = membersSnap.docs.map(d => (d.data() as { userId?: string })?.userId || d.id).filter(Boolean);
    
    if (userIds.length === 0) return [];
    
    const chunks: string[][] = [];
    for (let i = 0; i < userIds.length; i += FIRESTORE_IN_LIMIT) {
      chunks.push(userIds.slice(i, i + FIRESTORE_IN_LIMIT));
    }
    
    const snaps = await Promise.all(
      chunks.map(chunk => getDocs(query(collection(fb.firestore, "users"), where(documentId(), "in", chunk))))
    );

    const results: ParticipantResult[] = [];
    snaps.forEach(snap => {
      snap.docs.forEach(d => {
        const data = d.data() as { username?: string; name?: string; usernameLower?: string; avatarUrl?: string };
        const username = data?.username || data?.name || d.id;
        results.push({
          type: "user",
          id: d.id,
          name: username,
          username: username,
          usernameLower: data?.usernameLower || username.toLowerCase(),
          avatarUrl: data?.avatarUrl,
          groupName: groupName,
        });
      });
    });
    
    return results;
  } catch (err) {
    console.error(`Failed to fetch members for group ${groupId}:`, err);
    return [];
  }
};

export const getEventParticipantsProfiles = async (userIds: string[]): Promise<ParticipantResult[]> => {
  if (!userIds || userIds.length === 0) return [];
  
  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += FIRESTORE_IN_LIMIT) {
    chunks.push(userIds.slice(i, i + FIRESTORE_IN_LIMIT));
  }
  
  const snaps = await Promise.all(
    chunks.map(chunk => getDocs(query(collection(fb.firestore, "users"), where(documentId(), "in", chunk))))
  );

  const results: ParticipantResult[] = [];
  snaps.forEach(snap => {
    snap.docs.forEach(d => {
      const data = d.data();
      results.push({
        type: "user",
        id: d.id,
        name: data.username,
        username: data.username,
        usernameLower: data.usernameLower,
        avatarUrl: data.avatarUrl,
      });
    });
  });
  
  return results;
};

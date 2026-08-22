import { collection, query, where, limit, getDocs, documentId } from "firebase/firestore";
import { fb } from "@flaner/shared/firebase";
import { firestoreConverter } from "@flaner/shared/utils";
import type { ParticipantResult, UserParticipant, GroupParticipant } from "./types";

const refs = {
  // Dla wyszukiwania nakładamy light-weight typy by nie duplikować ogromnych modeli z innych MFE
  users: () => collection(fb.firestore, "users").withConverter(firestoreConverter<UserParticipant>()),
  groups: () => collection(fb.firestore, "groups").withConverter(firestoreConverter<GroupParticipant>()),
};

export const searchParticipants = async (searchStr: string, currentUserId?: string): Promise<ParticipantResult[]> => {
  if (!searchStr.trim()) return [];
  const qLower = searchStr.toLowerCase();
  
  const usersQ = query(
    refs.users(),
    where("usernameLower", ">=", qLower),
    where("usernameLower", "<=", qLower + "\uf8ff"),
    limit(5)
  );
  
  const groupsQ = query(
    refs.groups(),
    where("type", "==", "public"),
    where("nameLower", ">=", qLower),
    where("nameLower", "<=", qLower + "\uf8ff"),
    limit(5)
  );

  const [usersSnap, groupsSnap] = await Promise.all([getDocs(usersQ), getDocs(groupsQ)]);
  
  const users: ParticipantResult[] = usersSnap.docs.map(d => {
    const data = d.data();
    return { 
      type: "user", 
      id: d.id, 
      name: data.username, 
      avatarUrl: data.avatarUrl, 
      username: data.username,
      usernameLower: data.usernameLower
    };
  });

  const groups: ParticipantResult[] = groupsSnap.docs.map(d => {
    const data = d.data();
    // Kompensacja nazwy na potrzeby wspólnego interfejsu ParticipantResult w UI
    const groupName = "name" in data && typeof data.name === "string" ? data.name : d.id;
    return { 
      type: "group", 
      id: d.id, 
      name: groupName, 
      avatarUrl: data.avatarUrl 
    };
  });

  const all = [...users, ...groups];
  return currentUserId ? all.filter(p => p.id !== currentUserId) : all;
};

export const getGroupMembersAsParticipants = async (groupId: string, groupName: string): Promise<ParticipantResult[]> => {
  const membersSnap = await getDocs(collection(fb.firestore, `groups/${groupId}/members`));
  const userIds = membersSnap.docs.map(d => d.id);
  
  if (userIds.length === 0) return [];
  
  const chunks = [];
  for (let i = 0; i < userIds.length; i += 10) {
    chunks.push(userIds.slice(i, i + 10));
  }
  
  const results: ParticipantResult[] = [];
  for (const chunk of chunks) {
    const q = query(collection(fb.firestore, "users"), where(documentId(), "in", chunk));
    const snap = await getDocs(q);
    snap.docs.forEach(d => {
       const data = d.data();
       results.push({
          type: "user",
          id: d.id,
          name: data.username,
          username: data.username,
          usernameLower: data.usernameLower,
          avatarUrl: data.avatarUrl,
          groupName: groupName,
       });
    });
  }
  
  return results;
};

export const getEventParticipantsProfiles = async (userIds: string[]): Promise<ParticipantResult[]> => {
  if (!userIds || userIds.length === 0) return [];
  
  const chunks = [];
  for (let i = 0; i < userIds.length; i += 10) {
    chunks.push(userIds.slice(i, i + 10));
  }
  
  const results: ParticipantResult[] = [];
  for (const chunk of chunks) {
    const q = query(collection(fb.firestore, "users"), where(documentId(), "in", chunk));
    const snap = await getDocs(q);
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
  }
  
  return results;
};

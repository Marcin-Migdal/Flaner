import { collection, doc, setDoc, getDocs, deleteDoc, query, where, limit, onSnapshot, getDoc, updateDoc, serverTimestamp, collectionGroup, startAfter, QueryDocumentSnapshot, DocumentData, writeBatch } from "firebase/firestore";
import { fb, type UserType } from "@flaner-v2/shared";
import type { Group, GroupMember, GroupRequest, GroupRole, GroupInvitation } from "./types";

// Create Group
export const createGroup = async (
  groupData: Omit<Group, "id" | "createdAt" | "updatedAt" | "nameLower" | "ownerId">,
  ownerUid: string
): Promise<string> => {
  const newGroupRef = doc(collection(fb.firestore, "groups"));
  const groupId = newGroupRef.id;

  const now = Date.now();

  const groupDoc: Group = {
    ...groupData,
    id: groupId,
    nameLower: groupData.name.toLowerCase(),
    ownerId: ownerUid,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newGroupRef, groupDoc);

  // Add owner as a member
  const memberRef = doc(fb.firestore, `groups/${groupId}/members`, ownerUid);
  await setDoc(memberRef, {
    userId: ownerUid,
    role: "owner",
    joinedAt: now,
  } as GroupMember);

  return groupId;
};

// Update Group
export const updateGroup = async (
  groupId: string,
  updates: Partial<Omit<Group, "id" | "createdAt" | "ownerId">>
): Promise<void> => {
  const groupRef = doc(fb.firestore, "groups", groupId);
  const dataToUpdate: any = { ...updates, updatedAt: Date.now() };
  if (updates.name) {
    dataToUpdate.nameLower = updates.name.toLowerCase();
  }
  await updateDoc(groupRef, dataToUpdate);
};

// Delete Group (Cascading delete of subcollections)
export const deleteGroup = async (groupId: string): Promise<void> => {
  const batch = writeBatch(fb.firestore);

  // 1. Delete all member docs
  const membersSnap = await getDocs(collection(fb.firestore, `groups/${groupId}/members`));
  membersSnap.docs.forEach((d) => batch.delete(d.ref));

  // 2. Delete all request docs
  const requestsSnap = await getDocs(collection(fb.firestore, `groups/${groupId}/requests`));
  requestsSnap.docs.forEach((d) => batch.delete(d.ref));

  // 3. Delete all invitation docs in group AND recipient users subcollections
  const invitationsSnap = await getDocs(collection(fb.firestore, `groups/${groupId}/invitations`));
  invitationsSnap.docs.forEach((d) => {
    // Delete from group's invitations subcollection
    batch.delete(d.ref);

    // Delete from recipient user's groupInvitations subcollection
    const invData = d.data() as GroupInvitation;
    const recipientUserId = invData.userId || d.id;
    if (recipientUserId) {
      const userInvRef = doc(fb.firestore, `users/${recipientUserId}/groupInvitations`, groupId);
      batch.delete(userInvRef);
    }
  });

  // 4. Delete the group document itself
  const groupRef = doc(fb.firestore, "groups", groupId);
  batch.delete(groupRef);

  await batch.commit();
};

// Get Group Details
export const getGroup = async (groupId: string): Promise<Group | null> => {
  try {
    const groupRef = doc(fb.firestore, "groups", groupId);
    const snap = await getDoc(groupRef);
    if (!snap.exists()) return null;
    return snap.data() as Group;
  } catch (err) {
    console.warn(`Failed to fetch group ${groupId}:`, err);
    return null;
  }
};

// Search Global Groups (public only)
export const searchGlobalGroups = async (
  searchQuery: string,
  pageSize: number = 10,
  pageParam?: QueryDocumentSnapshot<DocumentData, DocumentData>
): Promise<{ groups: Group[]; nextCursor: QueryDocumentSnapshot<DocumentData, DocumentData> | undefined }> => {
  if (!searchQuery.trim()) return { groups: [], nextCursor: undefined };
  const qLower = searchQuery.toLowerCase();
  
  let q = query(
    collection(fb.firestore, "groups"),
    where("type", "==", "public"),
    where("nameLower", ">=", qLower),
    where("nameLower", "<=", qLower + "\uf8ff"),
    limit(pageSize)
  );

  if (pageParam) {
    q = query(q, startAfter(pageParam));
  }

  const snap = await getDocs(q);
  const groups = snap.docs.map((d) => d.data() as Group);
  const lastVisible = snap.docs.length === pageSize 
    ? (snap.docs[snap.docs.length - 1] as QueryDocumentSnapshot<DocumentData, DocumentData>) 
    : undefined;

  return {
    groups,
    nextCursor: lastVisible,
  };
};

// Get User's Groups (using collectionGroup query)
// Note: Requires a composite index in Firestore for collection "members" on "userId"
export const getUserGroups = async (userId: string): Promise<Group[]> => {
  const q = query(
    collectionGroup(fb.firestore, "members"),
    where("userId", "==", userId)
  );
  
  const membersSnap = await getDocs(q);
  const groupIds = membersSnap.docs.map(d => d.ref.parent.parent?.id).filter(Boolean) as string[];
  
  if (groupIds.length === 0) return [];
  
  // Since 'in' queries support max 10, we could fetch them individually or chunk
  // For simplicity here we fetch individually
  const groups: Group[] = [];
  for (const id of groupIds) {
    const g = await getGroup(id);
    if (g) groups.push(g);
  }
  
  return groups;
};

// Add / Join Member
export const addGroupMember = async (groupId: string, userId: string, role: GroupRole = "member"): Promise<void> => {
  const memberRef = doc(fb.firestore, `groups/${groupId}/members`, userId);
  await setDoc(memberRef, {
    userId,
    role,
    joinedAt: Date.now(),
  } as GroupMember);
};

// Remove Member
export const removeGroupMember = async (groupId: string, userId: string): Promise<void> => {
  const memberRef = doc(fb.firestore, `groups/${groupId}/members`, userId);
  await deleteDoc(memberRef);
};

// Update Member Role
export const updateGroupMemberRole = async (groupId: string, userId: string, role: GroupRole): Promise<void> => {
  const memberRef = doc(fb.firestore, `groups/${groupId}/members`, userId);
  await updateDoc(memberRef, { role });
};

// Transfer Group Ownership
export const transferGroupOwnership = async (groupId: string, currentOwnerId: string, newOwnerId: string): Promise<void> => {
  const batch = writeBatch(fb.firestore);
  
  const groupRef = doc(fb.firestore, "groups", groupId);
  batch.update(groupRef, { ownerId: newOwnerId, updatedAt: Date.now() });

  const currentOwnerMemberRef = doc(fb.firestore, `groups/${groupId}/members`, currentOwnerId);
  batch.update(currentOwnerMemberRef, { role: "admin" });

  const newOwnerMemberRef = doc(fb.firestore, `groups/${groupId}/members`, newOwnerId);
  batch.update(newOwnerMemberRef, { role: "owner" });

  await batch.commit();
};

// Request to Join Group
export const requestJoinGroup = async (groupId: string, userId: string): Promise<void> => {
  const reqRef = doc(fb.firestore, `groups/${groupId}/requests`, userId);
  await setDoc(reqRef, {
    userId,
    requestedAt: Date.now(),
  } as GroupRequest);
};

// Accept Join Request
export const acceptJoinRequest = async (groupId: string, userId: string): Promise<void> => {
  await addGroupMember(groupId, userId, "member");
  const reqRef = doc(fb.firestore, `groups/${groupId}/requests`, userId);
  await deleteDoc(reqRef);
};

// Reject Join Request
export const rejectJoinRequest = async (groupId: string, userId: string): Promise<void> => {
  const reqRef = doc(fb.firestore, `groups/${groupId}/requests`, userId);
  await deleteDoc(reqRef);
};

// Get Group Members
export const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
  try {
    const snap = await getDocs(collection(fb.firestore, `groups/${groupId}/members`));
    return snap.docs.map(d => d.data() as GroupMember);
  } catch (err) {
    console.warn(`Failed to fetch members for group ${groupId}:`, err);
    return [];
  }
};

// Get Group Requests
export const getGroupRequests = async (groupId: string): Promise<GroupRequest[]> => {
  try {
    const snap = await getDocs(collection(fb.firestore, `groups/${groupId}/requests`));
    return snap.docs.map(d => d.data() as GroupRequest);
  } catch (err) {
    console.warn(`Failed to fetch requests for group ${groupId}:`, err);
    return [];
  }
};

// Check if user has requested to join a group
export const getUserGroupRequest = async (groupId: string, userId: string): Promise<GroupRequest | null> => {
  try {
    const reqRef = doc(fb.firestore, `groups/${groupId}/requests`, userId);
    const snap = await getDoc(reqRef);
    if (!snap.exists()) return null;
    return snap.data() as GroupRequest;
  } catch (err) {
    return null;
  }
};

// ==========================================
// GROUP INVITATIONS
// ==========================================

export const inviteUserToGroup = async (
  groupId: string, 
  groupName: string, 
  userId: string, 
  invitedByUserId: string,
  groupAvatarUrl?: string | null
): Promise<void> => {
  // 0. Inviter must be a member of the group to invite others
  const memberRef = doc(fb.firestore, `groups/${groupId}/members`, invitedByUserId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) {
    throw new Error("Nie jesteś członkiem tej grupy, więc nie możesz wysyłać zaproszeń.");
  }

  const invitationData: import('./types').GroupInvitation = {
    groupId,
    groupName,
    groupAvatarUrl: groupAvatarUrl || null,
    userId,
    invitedByUserId,
    invitedAt: Date.now(),
  };

  // 1. Save to group's invitations subcollection
  const groupInvRef = doc(fb.firestore, `groups/${groupId}/invitations`, userId);
  await setDoc(groupInvRef, invitationData);

  // 2. Save to recipient user's groupInvitations subcollection
  const userInvRef = doc(fb.firestore, `users/${userId}/groupInvitations`, groupId);
  await setDoc(userInvRef, invitationData);

  // 3. Create notification for recipient user
  try {
    const invitorDoc = await getDoc(doc(fb.firestore, `users/${invitedByUserId}`));
    const invitorData = invitorDoc.data();

    const notifRef = doc(collection(fb.firestore, `users/${userId}/notifications`));
    await setDoc(notifRef, {
      id: notifRef.id,
      type: "group_invitation",
      senderUid: invitedByUserId,
      senderUsername: invitorData?.username || "Ktoś",
      senderAvatarUrl: invitorData?.avatarUrl || "",
      createdAt: Date.now(),
      read: false,
    });
  } catch (err) {
    console.error("Failed to create notification for group invitation:", err);
  }
};

export const acceptGroupInvitation = async (groupId: string, userId: string): Promise<void> => {
  // Add member
  await addGroupMember(groupId, userId, "member");
  // Remove invitation from group & user
  const groupInvRef = doc(fb.firestore, `groups/${groupId}/invitations`, userId);
  await deleteDoc(groupInvRef).catch(() => {});

  const userInvRef = doc(fb.firestore, `users/${userId}/groupInvitations`, groupId);
  await deleteDoc(userInvRef).catch(() => {});
};

export const rejectGroupInvitation = async (groupId: string, userId: string): Promise<void> => {
  const groupInvRef = doc(fb.firestore, `groups/${groupId}/invitations`, userId);
  await deleteDoc(groupInvRef).catch(() => {});

  const userInvRef = doc(fb.firestore, `users/${userId}/groupInvitations`, groupId);
  await deleteDoc(userInvRef).catch(() => {});
};

export const getUserGroupInvitations = async (userId: string): Promise<import('./types').GroupInvitation[]> => {
  if (!userId) return [];
  try {
    // Primary: fetch from user's groupInvitations subcollection
    const snap = await getDocs(collection(fb.firestore, `users/${userId}/groupInvitations`));
    const userInvs = snap.docs.map(d => d.data() as import('./types').GroupInvitation);
    if (userInvs.length > 0) {
      return userInvs;
    }
  } catch (err) {
    console.warn("Reading user groupInvitations subcollection failed:", err);
  }

  // Fallback: collectionGroup for legacy invitations
  try {
    const q = query(
      collectionGroup(fb.firestore, "invitations"),
      where("userId", "==", userId)
    );
    const cgSnap = await getDocs(q);
    return cgSnap.docs.map(d => d.data() as import('./types').GroupInvitation);
  } catch (err) {
    console.warn("collectionGroup invitations query failed:", err);
    return [];
  }
};

export const subscribeToUserGroupInvitations = (
  userId: string,
  callback: (invitations: import('./types').GroupInvitation[]) => void
) => {
  if (!userId) return () => {};
  const q = collection(fb.firestore, `users/${userId}/groupInvitations`);
  return onSnapshot(
    q,
    async (snap) => {
      let items = snap.docs.map((d) => d.data() as import('./types').GroupInvitation);
      if (items.length === 0) {
        items = await getUserGroupInvitations(userId);
      }
      callback(items);
    },
    async (error) => {
      console.warn("Realtime listener on user groupInvitations failed, falling back to query:", error);
      try {
        const fallbackItems = await getUserGroupInvitations(userId);
        callback(fallbackItems);
      } catch {
        callback([]);
      }
    }
  );
};

export const getGroupInvitations = async (groupId: string): Promise<import('./types').GroupInvitation[]> => {
  const snap = await getDocs(collection(fb.firestore, `groups/${groupId}/invitations`));
  return snap.docs.map(d => d.data() as import('./types').GroupInvitation);
};


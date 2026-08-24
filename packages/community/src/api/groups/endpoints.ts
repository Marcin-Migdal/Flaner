import { fb } from "@flaner/shared/firebase";
import { firestoreConverter } from "@flaner/shared/utils";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import type { Group, GroupInvitation, GroupMember, GroupRequest, GroupRole } from "./types";

const refs = {
  groups: () => collection(fb.firestore, "groups").withConverter(firestoreConverter<Group>()),
  group: (id: string) => doc(fb.firestore, "groups", id).withConverter(firestoreConverter<Group>()),
  members: (groupId: string) =>
    collection(fb.firestore, `groups/${groupId}/members`).withConverter(firestoreConverter<GroupMember>()),
  member: (groupId: string, userId: string) =>
    doc(fb.firestore, `groups/${groupId}/members`, userId).withConverter(firestoreConverter<GroupMember>()),
  membersGroup: () => collectionGroup(fb.firestore, "members").withConverter(firestoreConverter<GroupMember>()),
  requests: (groupId: string) =>
    collection(fb.firestore, `groups/${groupId}/requests`).withConverter(firestoreConverter<GroupRequest>()),
  request: (groupId: string, userId: string) =>
    doc(fb.firestore, `groups/${groupId}/requests`, userId).withConverter(firestoreConverter<GroupRequest>()),
  invitations: (groupId: string) =>
    collection(fb.firestore, `groups/${groupId}/invitations`).withConverter(firestoreConverter<GroupInvitation>()),
  invitation: (groupId: string, userId: string) =>
    doc(fb.firestore, `groups/${groupId}/invitations`, userId).withConverter(firestoreConverter<GroupInvitation>()),
  userInvitations: (userId: string) =>
    collection(fb.firestore, `users/${userId}/groupInvitations`).withConverter(firestoreConverter<GroupInvitation>()),
  userInvitation: (userId: string, groupId: string) =>
    doc(fb.firestore, `users/${userId}/groupInvitations`, groupId).withConverter(firestoreConverter<GroupInvitation>()),
  invitationsGroup: () =>
    collectionGroup(fb.firestore, "invitations").withConverter(firestoreConverter<GroupInvitation>()),
  userNotification: (userId: string) => doc(collection(fb.firestore, `users/${userId}/notifications`)),
};

// Create Group
export const createGroup = async (
  groupData: Omit<Group, "id" | "createdAt" | "updatedAt" | "nameLower" | "ownerId">,
  ownerUid: string,
): Promise<string> => {
  const newGroupRef = doc(refs.groups());
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
  await setDoc(refs.member(groupId, ownerUid), {
    userId: ownerUid,
    role: "owner",
    joinedAt: now,
  });

  return groupId;
};

// Update Group
export const updateGroup = async (
  groupId: string,
  updates: Partial<Omit<Group, "id" | "createdAt" | "ownerId">>,
): Promise<void> => {
  const dataToUpdate: Partial<Group> = { ...updates, updatedAt: Date.now() };
  if (updates.name) {
    dataToUpdate.nameLower = updates.name.toLowerCase();
  }
  await updateDoc(refs.group(groupId), dataToUpdate);
};

// Delete Group (Cascading delete of subcollections)
export const deleteGroup = async (groupId: string): Promise<void> => {
  const batch = writeBatch(fb.firestore);

  // 1. Delete all member docs
  const membersSnap = await getDocs(refs.members(groupId));
  membersSnap.docs.forEach((d) => batch.delete(d.ref));

  // 2. Delete all request docs
  const requestsSnap = await getDocs(refs.requests(groupId));
  requestsSnap.docs.forEach((d) => batch.delete(d.ref));

  // 3. Delete all invitation docs in group AND recipient users subcollections
  const invitationsSnap = await getDocs(refs.invitations(groupId));
  invitationsSnap.docs.forEach((d) => {
    // Delete from group's invitations subcollection
    batch.delete(d.ref);

    // Delete from recipient user's groupInvitations subcollection
    const invData = d.data();
    const recipientUserId = invData.userId || d.id;
    if (recipientUserId) {
      batch.delete(refs.userInvitation(recipientUserId, groupId));
    }
  });

  // 4. Delete the group document itself
  batch.delete(refs.group(groupId));

  await batch.commit();
};

// Get Group Details
export const getGroup = async (groupId: string): Promise<Group | null> => {
  try {
    const snap = await getDoc(refs.group(groupId));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.warn(`Failed to fetch group ${groupId}:`, e);
    return null;
  }
};

// Search Global Groups (public only)
export const searchGlobalGroups = async (
  searchQuery: string,
  pageSize: number = 10,
  pageParam?: QueryDocumentSnapshot<Group>,
): Promise<{ groups: Group[]; nextCursor: QueryDocumentSnapshot<Group> | undefined }> => {
  if (!searchQuery.trim()) return { groups: [], nextCursor: undefined };
  const qLower = searchQuery.toLowerCase();

  let q = query(
    refs.groups(),
    where("type", "==", "public"),
    where("nameLower", ">=", qLower),
    where("nameLower", "<=", qLower + "\uf8ff"),
    limit(pageSize),
  );

  if (pageParam) {
    q = query(q, startAfter(pageParam));
  }

  const snap = await getDocs(q);
  const groups = snap.docs.map((d) => d.data());
  const lastVisible = snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : undefined;

  return {
    groups,
    nextCursor: lastVisible,
  };
};

// Get User's Groups (using collectionGroup query)
// Note: Requires a composite index in Firestore for collection "members" on "userId"
export const getUserGroups = async (userId: string): Promise<Group[]> => {
  const q = query(refs.membersGroup(), where("userId", "==", userId));

  const membersSnap = await getDocs(q);
  const groupIds = membersSnap.docs.map((d) => d.ref.parent.parent?.id).filter(Boolean) as string[];

  if (groupIds.length === 0) return [];

  const groups: Group[] = [];
  for (const id of groupIds) {
    const g = await getGroup(id);
    if (g) groups.push(g);
  }

  return groups;
};

// Add / Join Member
export const addGroupMember = async (groupId: string, userId: string, role: GroupRole = "member"): Promise<void> => {
  await setDoc(refs.member(groupId, userId), {
    userId,
    role,
    joinedAt: Date.now(),
  });
};

// Remove Member
export const removeGroupMember = async (groupId: string, userId: string): Promise<void> => {
  await deleteDoc(refs.member(groupId, userId));
};

// Update Member Role
export const updateGroupMemberRole = async (groupId: string, userId: string, role: GroupRole): Promise<void> => {
  await updateDoc(refs.member(groupId, userId), { role });
};

// Transfer Group Ownership
export const transferGroupOwnership = async (
  groupId: string,
  currentOwnerId: string,
  newOwnerId: string,
): Promise<void> => {
  const batch = writeBatch(fb.firestore);

  batch.update(refs.group(groupId), { ownerId: newOwnerId, updatedAt: Date.now() });
  batch.update(refs.member(groupId, currentOwnerId), { role: "admin" });
  batch.update(refs.member(groupId, newOwnerId), { role: "owner" });

  await batch.commit();
};

// Request to Join Group
export const requestJoinGroup = async (groupId: string, userId: string): Promise<void> => {
  await setDoc(refs.request(groupId, userId), {
    userId,
    requestedAt: Date.now(),
  });
};

// Accept Join Request
export const acceptJoinRequest = async (groupId: string, userId: string): Promise<void> => {
  await addGroupMember(groupId, userId, "member");
  await deleteDoc(refs.request(groupId, userId));
};

// Reject Join Request
export const rejectJoinRequest = async (groupId: string, userId: string): Promise<void> => {
  await deleteDoc(refs.request(groupId, userId));
};

// Get Group Members
export const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
  try {
    const snap = await getDocs(refs.members(groupId));
    return snap.docs.map((d) => d.data());
  } catch (_e) {
    console.warn(`Failed to fetch members for group ${groupId}:`, _e);
    return [];
  }
};

// Get Group Requests
export const getGroupRequests = async (groupId: string): Promise<GroupRequest[]> => {
  try {
    const snap = await getDocs(refs.requests(groupId));
    return snap.docs.map((d) => d.data());
  } catch (_e) {
    console.warn(`Failed to fetch requests for group ${groupId}:`, _e);
    return [];
  }
};

// Check if user has requested to join a group
export const getUserGroupRequest = async (groupId: string, userId: string): Promise<GroupRequest | null> => {
  try {
    const snap = await getDoc(refs.request(groupId, userId));
    return snap.exists() ? snap.data() : null;
  } catch {
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
  groupAvatarUrl?: string | null,
): Promise<void> => {
  const memberSnap = await getDoc(refs.member(groupId, invitedByUserId));
  if (!memberSnap.exists()) {
    throw new Error("Nie jesteś członkiem tej grupy, więc nie możesz wysyłać zaproszeń.");
  }

  const invitationData: GroupInvitation = {
    groupId,
    groupName,
    groupAvatarUrl: groupAvatarUrl || null,
    userId,
    invitedByUserId,
    invitedAt: Date.now(),
  };

  await setDoc(refs.invitation(groupId, userId), invitationData);
  await setDoc(refs.userInvitation(userId, groupId), invitationData);

  try {
    const invitorDoc = await getDoc(doc(fb.firestore, `users/${invitedByUserId}`));
    const invitorData = invitorDoc.data();

    const notifRef = refs.userNotification(userId);
    await setDoc(notifRef, {
      id: notifRef.id,
      type: "group_invitation",
      senderUid: invitedByUserId,
      senderUsername: invitorData?.username || "",
      senderAvatarUrl: invitorData?.avatarUrl || "",
      createdAt: Date.now(),
      read: false,
    });
  } catch (_e) {
    console.error("Failed to create notification for group invitation:", _e);
  }
};

export const acceptGroupInvitation = async (groupId: string, userId: string): Promise<void> => {
  await addGroupMember(groupId, userId, "member");
  await deleteDoc(refs.invitation(groupId, userId)).catch(() => {});
  await deleteDoc(refs.userInvitation(userId, groupId)).catch(() => {});
};

export const rejectGroupInvitation = async (groupId: string, userId: string): Promise<void> => {
  await deleteDoc(refs.invitation(groupId, userId)).catch(() => {});
  await deleteDoc(refs.userInvitation(userId, groupId)).catch(() => {});
};

export const getUserGroupInvitations = async (userId: string): Promise<GroupInvitation[]> => {
  if (!userId) return [];
  try {
    const snap = await getDocs(refs.userInvitations(userId));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data());
    }
  } catch (_e) {
    console.warn("Reading user groupInvitations subcollection failed:", _e);
  }

  try {
    const q = query(refs.invitationsGroup(), where("userId", "==", userId));
    const cgSnap = await getDocs(q);
    return cgSnap.docs.map((d) => d.data());
  } catch (_e) {
    console.warn("collectionGroup invitations query failed:", _e);
    return [];
  }
};

export const subscribeToUserGroupInvitations = (userId: string, callback: (invitations: GroupInvitation[]) => void) => {
  if (!userId) return () => {};
  return onSnapshot(
    refs.userInvitations(userId),
    async (snap) => {
      let items = snap.docs.map((d) => d.data());
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
    },
  );
};

export const getGroupInvitations = async (groupId: string): Promise<GroupInvitation[]> => {
  const snap = await getDocs(refs.invitations(groupId));
  return snap.docs.map((d) => d.data());
};

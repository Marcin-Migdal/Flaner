// Firestore rules spec: .agents/skills/firestore-rules-manager/docs/groups.md, users.md (keep their Write flows / Queries in sync).
import {
  createNotification,
  getNotificationSender,
  getUnreadNotificationRefs,
  sourceNotificationRef,
  type NotificationContent,
  type NotificationSender,
} from "@flaner/shared/api";
import { fb } from "@flaner/shared/firebase";
import { deleteInBatches, firestoreConverter } from "@flaner/shared/utils";
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
  type FirestoreError,
  type QueryDocumentSnapshot,
  type WriteBatch,
} from "firebase/firestore";
import type { Group, GroupInvitation, GroupMember, GroupRequest, GroupRole, RolePermissionsMap } from "./types";

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
  // The invitee's "group_invitation" notification (deterministic id, removed when the invitation resolves)
  invitationNotification: (userId: string, groupId: string) => sourceNotificationRef(userId, "group_invitation", groupId),
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

  // One batch: the owner bootstrap rule reads the group with getAfter()
  const batch = writeBatch(fb.firestore);
  batch.set(newGroupRef, groupDoc);
  batch.set(refs.member(groupId, ownerUid), { userId: ownerUid, role: "owner", joinedAt: now });
  await batch.commit();

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

// Update Group Role Permissions
export const updateGroupRolePermissions = async (
  groupId: string,
  rolePermissions: RolePermissionsMap,
): Promise<void> => {
  await updateDoc(refs.group(groupId), {
    rolePermissions,
    updatedAt: Date.now(),
  });
};

// ==========================================
// GROUP NOTIFICATIONS (written in the same batch as the action)
// ==========================================

type GroupOutcomeType = Exclude<Extract<NotificationContent, { groupId: string }>["type"], "group_invitation">;

const addGroupNotification = (
  batch: WriteBatch,
  recipientId: string,
  type: GroupOutcomeType,
  sender: NotificationSender,
  group: { id: string; name: string },
) => {
  const notification = createNotification(recipientId, sender, { type, groupId: group.id, groupName: group.name });
  batch.set(notification.ref, notification.data);
};

// Delete Group (Cascading delete of subcollections)
export const deleteGroup = async (groupId: string): Promise<void> => {
  const [groupSnap, membersSnap, requestsSnap, invitationsSnap] = await Promise.all([
    getDoc(refs.group(groupId)),
    getDocs(refs.members(groupId)),
    getDocs(refs.requests(groupId)),
    getDocs(refs.invitations(groupId)),
  ]);

  // The owner's member doc is what authorizes the other deletes, and the owner may delete it only
  // together with the group — so it goes last, in one batch with the group doc.
  const ownerMemberDocs = membersSnap.docs.filter((d) => d.data().role === "owner");
  const otherMemberDocs = membersSnap.docs.filter((d) => d.data().role !== "owner");

  const invitationRefs = invitationsSnap.docs.flatMap((d) => {
    // Delete from the group's invitations AND the recipient user's groupInvitations mirror
    const recipientUserId = d.data().userId || d.id;
    return recipientUserId ? [d.ref, refs.userInvitation(recipientUserId, groupId)] : [d.ref];
  });

  await deleteInBatches(fb.firestore, [
    ...otherMemberDocs.map((d) => d.ref),
    ...requestsSnap.docs.map((d) => d.ref),
    ...invitationRefs,
  ]);

  // Pending invitees' unread "group_invitation" notifications (read ones stay); the owner may delete them while still a member
  const staleNotifications = await getUnreadNotificationRefs(
    invitationsSnap.docs.map((d) => refs.invitationNotification(d.data().userId || d.id, groupId)),
  );

  const batch = writeBatch(fb.firestore);
  ownerMemberDocs.forEach((d) => batch.delete(d.ref));
  batch.delete(refs.group(groupId));
  staleNotifications.forEach((ref) => batch.delete(ref));

  // shortcut: one notification per member in the final batch, so >~495 members overflow the 500-write limit; chunk if groups get that big
  const ownerId = ownerMemberDocs[0]?.data().userId;
  if (ownerId) {
    const sender = await getNotificationSender(ownerId);
    const group = { id: groupId, name: groupSnap.data()?.name ?? "" };
    otherMemberDocs.forEach((d) => addGroupNotification(batch, d.data().userId, "group_deleted", sender, group));
  }

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
  const groupIds = membersSnap.docs.flatMap((d) => d.ref.parent.parent?.id ?? []);

  const groups = await Promise.all(groupIds.map(getGroup));
  return groups.filter((g): g is Group => g !== null);
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
  const [groupSnap, sender] = await Promise.all([getDoc(refs.group(groupId)), getNotificationSender(currentOwnerId)]);
  const batch = writeBatch(fb.firestore);

  batch.update(refs.group(groupId), { ownerId: newOwnerId, updatedAt: Date.now() });
  batch.update(refs.member(groupId, currentOwnerId), { role: "admin" });
  batch.update(refs.member(groupId, newOwnerId), { role: "owner" });
  addGroupNotification(batch, newOwnerId, "group_ownership_transferred", sender, {
    id: groupId,
    name: groupSnap.data()?.name ?? "",
  });

  await batch.commit();
};

// Request to Join Group
export const requestJoinGroup = async (groupId: string, userId: string): Promise<void> => {
  await setDoc(refs.request(groupId, userId), {
    userId,
    requestedAt: Date.now(),
  });
};

// Accept / reject a join request; actorId is the staff member resolving it (the notification sender)
const resolveJoinRequest = async (groupId: string, userId: string, actorId: string, accept: boolean) => {
  const [groupSnap, sender] = await Promise.all([getDoc(refs.group(groupId)), getNotificationSender(actorId)]);
  const batch = writeBatch(fb.firestore);
  if (accept) batch.set(refs.member(groupId, userId), { userId, role: "member", joinedAt: Date.now() });
  batch.delete(refs.request(groupId, userId));
  addGroupNotification(batch, userId, accept ? "group_request_accepted" : "group_request_rejected", sender, {
    id: groupId,
    name: groupSnap.data()?.name ?? "",
  });
  await batch.commit();
};

export const acceptJoinRequest = (groupId: string, userId: string, actorId: string): Promise<void> =>
  resolveJoinRequest(groupId, userId, actorId, true);

export const rejectJoinRequest = (groupId: string, userId: string, actorId: string): Promise<void> =>
  resolveJoinRequest(groupId, userId, actorId, false);

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
    throw new Error("community:errors.notGroupMember");
  }

  const invitationData: GroupInvitation = {
    groupId,
    groupName,
    groupAvatarUrl: groupAvatarUrl || null,
    userId,
    invitedByUserId,
    invitedAt: Date.now(),
  };

  const sender = await getNotificationSender(invitedByUserId);

  const batch = writeBatch(fb.firestore);
  batch.set(refs.invitation(groupId, userId), invitationData);
  batch.set(refs.userInvitation(userId, groupId), invitationData);
  const notification = createNotification(userId, sender, {
    type: "group_invitation",
    sourceId: groupId,
    groupId,
    groupName,
  });
  batch.set(notification.ref, notification.data);
  await batch.commit();
};

// The invitee answers; the inviter (from the invitation doc) gets an accepted / rejected notification.
const answerGroupInvitation = async (groupId: string, userId: string, accept: boolean) => {
  const [invitationSnap, sender, staleNotifications] = await Promise.all([
    getDoc(refs.invitation(groupId, userId)),
    getNotificationSender(userId),
    getUnreadNotificationRefs([refs.invitationNotification(userId, groupId)]),
  ]);
  const invitation = invitationSnap.data();

  const batch = writeBatch(fb.firestore);
  // The member create rule checks the invitation with exists(), which sees the state before the batch,
  // so deleting the invitation in the same batch is allowed.
  if (accept) batch.set(refs.member(groupId, userId), { userId, role: "member", joinedAt: Date.now() });
  batch.delete(refs.invitation(groupId, userId));
  batch.delete(refs.userInvitation(userId, groupId));
  staleNotifications.forEach((ref) => batch.delete(ref));
  if (invitation && invitation.invitedByUserId !== userId) {
    addGroupNotification(
      batch,
      invitation.invitedByUserId,
      accept ? "group_invitation_accepted" : "group_invitation_rejected",
      sender,
      { id: groupId, name: invitation.groupName },
    );
  }
  await batch.commit();
};

export const acceptGroupInvitation = (groupId: string, userId: string): Promise<void> =>
  answerGroupInvitation(groupId, userId, true);

export const rejectGroupInvitation = (groupId: string, userId: string): Promise<void> =>
  answerGroupInvitation(groupId, userId, false);

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

export const subscribeToUserGroupInvitations = (
  userId: string,
  callback: (invitations: GroupInvitation[]) => void,
  onError: (error: FirestoreError) => void,
) => {
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
    onError,
  );
};

export const getGroupInvitations = async (groupId: string): Promise<GroupInvitation[]> => {
  const snap = await getDocs(refs.invitations(groupId));
  return snap.docs.map((d) => d.data());
};

// ==========================================
// REALTIME SUBSCRIPTIONS
// A listener error (usually permission-denied after losing access, e.g. removed from a private group) goes to
// onError: useRealtimeQueryData puts the query in the error state, the views treat isError as "no access".
// ==========================================

type Unsubscribe = () => void;
type OnError = (error: FirestoreError) => void;

export const subscribeToGroup = (groupId: string, onUpdate: (group: Group | null) => void, onError: OnError): Unsubscribe =>
  onSnapshot(
    refs.group(groupId),
    (snap) => onUpdate(snap.exists() ? snap.data() : null),
    onError,
  );

export const subscribeToGroupMembers = (groupId: string, onUpdate: (members: GroupMember[]) => void, onError: OnError): Unsubscribe =>
  onSnapshot(
    refs.members(groupId),
    (snap) => onUpdate(snap.docs.map((d) => d.data())),
    onError,
  );

export const subscribeToGroupRequests = (groupId: string, onUpdate: (requests: GroupRequest[]) => void, onError: OnError): Unsubscribe =>
  onSnapshot(
    refs.requests(groupId),
    (snap) => onUpdate(snap.docs.map((d) => d.data())),
    onError,
  );

export const subscribeToGroupInvitations = (
  groupId: string,
  onUpdate: (invitations: GroupInvitation[]) => void,
  onError: OnError,
): Unsubscribe =>
  onSnapshot(
    refs.invitations(groupId),
    (snap) => onUpdate(snap.docs.map((d) => d.data())),
    onError,
  );

export const subscribeToUserGroupRequest = (
  groupId: string,
  userId: string,
  onUpdate: (request: GroupRequest | null) => void,
  onError: OnError,
): Unsubscribe =>
  onSnapshot(
    refs.request(groupId, userId),
    (snap) => onUpdate(snap.exists() ? snap.data() : null),
    onError,
  );

// Memberships come from one collection-group listener; each group doc gets its own listener so renames,
// type changes etc. show up live. Emits only once every current group has loaded, to avoid a partial list.
// A group listener error means the user just lost access to it (removed), which the memberships listener
// reports next, so that group is dropped instead of failing the whole list.
export const subscribeToUserGroups = (
  userId: string,
  onUpdate: (groups: Group[]) => void,
  onError: OnError,
): Unsubscribe => {
  const groupListeners = new Map<string, Unsubscribe>();
  const groups = new Map<string, Group | null>();
  let groupIds: string[] = [];

  const emit = () => {
    if (groupIds.some((id) => !groups.has(id))) return;
    onUpdate(groupIds.flatMap((id) => groups.get(id) ?? []));
  };

  const unsubscribeMembers = onSnapshot(
    query(refs.membersGroup(), where("userId", "==", userId)),
    (snap) => {
      groupIds = snap.docs.flatMap((d) => d.ref.parent.parent?.id ?? []);

      groupListeners.forEach((unsubscribe, id) => {
        if (groupIds.includes(id)) return;
        unsubscribe();
        groupListeners.delete(id);
        groups.delete(id);
      });

      groupIds.forEach((id) => {
        if (groupListeners.has(id)) return;
        groupListeners.set(
          id,
          subscribeToGroup(
            id,
            (group) => {
              groups.set(id, group);
              emit();
            },
            () => {
              groups.set(id, null);
              emit();
            },
          ),
        );
      });

      emit();
    },
    onError,
  );

  return () => {
    unsubscribeMembers();
    groupListeners.forEach((unsubscribe) => unsubscribe());
  };
};

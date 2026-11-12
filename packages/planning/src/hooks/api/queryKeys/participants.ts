// Participant query keys. All fetched on demand (search, profiles, a group's members as participants)
// and never written by planning, so nothing invalidates them; profiles refetch on mount.
export const participantKeys = {
  // Sorted copy: the ids often come from cached (realtime) data, which must not be mutated in place
  profiles: (userIds: string[]) => ["participants", "profiles", [...userIds].sort().join(",")],
  search: (searchQuery: string, currentUserId?: string) => ["participants", "search", searchQuery, currentUserId],
  groupMembers: (groupId: string) => ["participants", "groupMembers", groupId],
};

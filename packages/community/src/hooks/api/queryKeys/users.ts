// Users / friends query keys — the only place that builds them.
// Friends and friend requests (sent / received) are listener-backed, so no friend write invalidates anything.
// The user search and the profile lookups are fetched but hold no friend state (a friend button reads the
// realtime lists), so friend writes do not make them stale either.
export const userKeys = {
  friends: (uid: string) => ["users", "friends", uid],
  sentRequests: (uid: string) => ["users", "sentRequests", uid],
  receivedRequests: (uid: string) => ["users", "receivedRequests", uid],
  profiles: (uids: string[]) => ["users", "profiles", uids],
  profilesRealtime: (uids: string[]) => ["users", "profilesRealtime", [...uids].sort()],
  search: (searchQuery: string, uid: string) => ["users", "search", searchQuery, uid],
};

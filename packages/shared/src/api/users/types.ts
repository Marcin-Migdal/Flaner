import type { UserProfile } from "../../types";

/** Stored doc `usernames/{usernameLower}`: the owner of the username. */
export type UsernameReservation = { uid: string };

/** A new profile: `usernameLower` is derived from `username`. */
export type NewUserProfile = Omit<UserProfile, "usernameLower" | "startupWaste">;

/** Fields a user changes on their own profile; a new `username` moves the reservation. */
export type UserProfileUpdate = Partial<Pick<UserProfile, "username" | "avatarUrl" | "darkMode" | "language" | "startupWaste">>;

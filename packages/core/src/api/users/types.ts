import type { UserProfile } from "@flaner/shared/types";

export type UserPreferences = Partial<Pick<UserProfile, "language" | "darkMode">>;

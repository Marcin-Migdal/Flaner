import { getUserProfile, updateUserProfile } from "@flaner/shared/api";

/** Grams wasted at every print start when the user has not set their own value. */
const DEFAULT_STARTUP_WASTE = 1.5;

export const getStartupWaste = async (userId: string): Promise<number> =>
  (await getUserProfile(userId))?.startupWaste ?? DEFAULT_STARTUP_WASTE;

export const updateStartupWaste = (userId: string, startupWaste: number): Promise<void> =>
  updateUserProfile(userId, { startupWaste });

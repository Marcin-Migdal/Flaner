import type { NotificationTargets } from "@flaner/shared/api";
import { MFE_NAMES } from "@flaner/shared/constants";
import { loadRemote } from "@module-federation/runtime";

/**
 * Every MFE's notification targets (its `./notificationTargets` expose), merged. An MFE without the expose, or one
 * that fails to load, adds nothing, so its notifications open nowhere instead of breaking the others.
 */
export const loadNotificationTargets = async (): Promise<NotificationTargets> => {
  const results = await Promise.allSettled(
    Object.values(MFE_NAMES).map((name) =>
      loadRemote<{ notificationTargets: NotificationTargets }>(`${name}/notificationTargets`),
    ),
  );
  return results.reduce<NotificationTargets>(
    (targets, result) => (result.status === "fulfilled" ? { ...targets, ...result.value?.notificationTargets } : targets),
    {},
  );
};

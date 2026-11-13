import type { AppNotification } from "@flaner/shared/api";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { loadNotificationTargets } from "../../utils/loadNotificationTargets";
import { notificationKeys } from "../api/queryKeys";

const notificationTargetsQuery = queryOptions({
  queryKey: notificationKeys.targets(),
  queryFn: loadNotificationTargets,
  staleTime: Infinity,
});

/**
 * Opens a notification's target, declared by the MFE that owns its type. The targets start loading on mount;
 * a click before they arrive waits for them instead of doing nothing.
 */
export const useOpenNotification = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useQuery(notificationTargetsQuery);

  return async (notification: AppNotification) => {
    const targets = await queryClient.ensureQueryData(notificationTargetsQuery);
    const target = targets[notification.type]?.(notification);
    if (target) navigate(target);
  };
};

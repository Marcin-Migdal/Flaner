import type { NotificationTargets } from "@flaner/shared/api";
import { MFE_NAMES } from "@flaner/shared/constants";

const base = `/${MFE_NAMES.PLANNING}`;

/** Where planning's notifications link to (loaded by core through the `./notificationTargets` expose). */
export const notificationTargets: NotificationTargets = {
  event_invitation: ({ eventId }) => ({ pathname: `${base}/scheduling`, hash: eventId ?? "" }),
  event_reopened: ({ eventId }) => ({ pathname: `${base}/scheduling`, hash: eventId ?? "" }),
  split_group_invitation: ({ splitGroupId }) => ({ pathname: `${base}/splits`, hash: splitGroupId ?? "" }),
  split_settlement_pending: ({ splitGroupId }) => ({ pathname: `${base}/splits`, hash: splitGroupId ?? "" }),
};

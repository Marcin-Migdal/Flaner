import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

const getOnline = () => onlineManager.isOnline();

/** Whether the browser has a connection (TanStack Query's `onlineManager`, fed by the `online` / `offline` events). */
export const useIsOnline = (): boolean => useSyncExternalStore((onChange) => onlineManager.subscribe(onChange), getOnline);

import { useAuth } from "@flaner/shared/context";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

/**
 * Drops the previous user's cached queries when the session ends without a reload
 * (sign-out in another tab, expired session) — the sign-out button reloads the page itself.
 */
export const QueryCacheReset = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const previousUid = useRef<string | null>(null);
  const uid = user?.uid ?? null;

  useEffect(() => {
    if (previousUid.current && previousUid.current !== uid) queryClient.clear();
    previousUid.current = uid;
  }, [uid, queryClient]);

  return null;
};

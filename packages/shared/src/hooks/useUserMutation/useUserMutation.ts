import { useMutation, useQueryClient, type MutationMeta, type QueryKey, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext/AuthContext.context";
import type { UserType } from "../../types";

/** The one "not signed in" error (translated from `common`, shown by the global toast handler). */
export const USER_NOT_AUTHENTICATED = "errors.userNotAuthenticated";

/** Signed-in-user guard for `queryFn` / `mutationFn`: returns the user or throws `USER_NOT_AUTHENTICATED`. */
export const requireUser = (user: UserType | null): UserType => {
  if (!user) throw new Error(USER_NOT_AUTHENTICATED);
  return user;
};

export type UserMutationConfig<TData, TVariables> = {
  /** Named after the endpoint; the global `MutationCache.onError` logs it. */
  mutationKey: [string];
  mutationFn: (variables: TVariables, user: UserType) => Promise<TData>;
  /**
   * Keys this write makes stale, usually an entry of the domain's invalidation table.
   * Never list listener-backed (realtime) keys: the listener already pushes the change.
   */
  invalidates?: (user: UserType, variables: TVariables) => QueryKey[];
  meta?: MutationMeta;
};

/**
 * `useMutation` for a signed-in user: guards the user, invalidates `invalidates` on success,
 * then runs the caller's `onSuccess`. Caller `options` (including `meta`) override the config.
 */
export const useUserMutation = <TData = void, TVariables = void>(
  { mutationKey, mutationFn, invalidates, meta }: UserMutationConfig<TData, TVariables>,
  options?: UseMutationOptions<TData, Error, TVariables>,
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationKey,
    meta,
    mutationFn: (variables) => mutationFn(variables, requireUser(user)),
    ...options,
    onSuccess: async (...args) => {
      if (user && invalidates) {
        invalidates(user, args[1]).forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      }
      await options?.onSuccess?.(...args);
    },
  });
};

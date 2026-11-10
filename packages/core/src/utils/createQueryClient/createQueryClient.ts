import { logError, toast } from "@flaner/shared/utils";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { FirebaseError } from "firebase/app";
import i18n from "../../i18n/i18n";
import { resolveApiToastMessage } from "../resolveApiToastMessage";

const t = (key: string) => i18n.t(key);

export const createQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        logError("query", error, { operation: query.queryKey, meta: query.meta });

        // Losing access to data already shown (e.g. removed from a group while a realtime listener runs)
        // is expected: the view handles isError, a toast would only add noise.
        const lostAccess =
          error instanceof FirebaseError && error.code === "permission-denied" && query.state.data !== undefined;
        if (lostAccess) return;

        const finalMessage = resolveApiToastMessage(t, query.meta?.errorMessageKey, error, "errors.fetchError");

        if (finalMessage) toast.failure(finalMessage);
      },
    }),
    mutationCache: new MutationCache({
      onSuccess: (data, _variables, _context, { meta }) => {
        let dynamicMsg: string | undefined;

        if (data && typeof data === "object" && "message" in data && typeof data.message === "string") {
          dynamicMsg = data.message;
        }

        const finalMessage = resolveApiToastMessage(t, meta?.successMessageKey, dynamicMsg ? { message: dynamicMsg } : null);

        if (finalMessage) toast.success(finalMessage);
      },
      onError: (error, _variables, _context, mutation) => {
        logError("mutation", error, { operation: mutation.options.mutationKey, meta: mutation.meta });

        const finalMessage = resolveApiToastMessage(t, mutation.meta?.errorMessageKey, error, "errors.mutationError");

        if (finalMessage) toast.failure(finalMessage);
      },
    }),
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  });

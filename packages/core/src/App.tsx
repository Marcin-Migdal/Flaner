import { AuthProvider } from "@flaner/shared/context";
import { toast } from "@flaner/shared/utils";
import { Toaster } from "@flaner/ui-components";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { QueryCacheReset } from "./components/QueryCacheReset";
import { RouterProvider } from "react-router";
import i18n from "./i18n/i18n";
import { resolveApiToastMessage } from "./utils/resolveApiToastMessage";
import { router } from "./routes/router";

const t = (key: string) => i18n.t(key);

const getQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error, { meta }) => {
        const finalMessage = resolveApiToastMessage(t, meta?.errorMessageKey, error, "errors.fetchError");

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
      onError: (error, _variables, _context, { meta }) => {
        const finalMessage = resolveApiToastMessage(t, meta?.errorMessageKey, error, "errors.mutationError");

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

export function App() {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <QueryCacheReset />
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

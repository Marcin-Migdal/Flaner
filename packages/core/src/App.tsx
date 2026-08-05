import { AuthProvider } from "@flaner/shared/context";
import { toast } from "@flaner/shared/utils";
import { Toaster } from "@flaner/ui-components";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { RouterProvider } from "react-router";
import i18n from "./i18n/i18n";
import { router } from "./routes/router";

const resolveApiToastMessage = (metaKey?: string, dynamicMessage?: string, fallbackKey?: string) => {
  const t = (key: string) => i18n.t(key);
  if (dynamicMessage?.includes("permission-denied")) {
    return t("errors.permissionDenied");
  }

  // Matches strictly keys starting with toasts. or errors. (e.g., "toasts.error" or "community:errors.permissionDenied")
  const isDynamicKey = dynamicMessage && /^([a-zA-Z0-9_]+:)?(toasts\.|errors\.)/.test(dynamicMessage);

  if (isDynamicKey) return t(dynamicMessage);
  if (metaKey) return t(metaKey);
  return fallbackKey ? t(fallbackKey) : undefined;
};

const getQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error, { meta }) => {
        const finalMessage = resolveApiToastMessage(meta?.errorMessageKey, error?.message, "errors.fetchError");

        if (finalMessage) toast.failure(finalMessage);
      },
    }),
    mutationCache: new MutationCache({
      onSuccess: (data, _variables, _context, { meta }) => {
        let dynamicMsg: string | undefined;

        if (data && typeof data === "object" && "message" in data && typeof data.message === "string") {
          dynamicMsg = data.message;
        }

        const finalMessage = resolveApiToastMessage(meta?.successMessageKey, dynamicMsg);

        if (finalMessage) toast.success(finalMessage);
      },
      onError: (error, _variables, _context, { meta }) => {
        const finalMessage = resolveApiToastMessage(meta?.errorMessageKey, error?.message, "errors.mutationError");

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
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

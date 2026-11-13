import { AuthProvider } from "@flaner/shared/context";
import { Toaster } from "@flaner/ui-components";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { QueryCacheReset } from "./components/QueryCacheReset";
import { RouterProvider } from "react-router";
import { createQueryClient } from "./utils/createQueryClient";
import { router } from "./routes/router";

export function App() {
  const [queryClient] = useState(createQueryClient);

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

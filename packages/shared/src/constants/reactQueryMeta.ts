export const reactQueryMeta = {
  fetch: { errorMessageKey: "errors.fetchError" },
  mutate: { 
    errorMessageKey: "errors.mutationError",
    successMessageKey: "success.mutationSuccess" 
  },
} as const;

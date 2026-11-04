import { FirebaseError } from "firebase/app";

// Matches strictly keys starting with toasts. or errors. (e.g., "toasts.error" or "community:errors.permissionDenied")
const DYNAMIC_KEY = /^([a-zA-Z0-9_]+:)?(toasts\.|errors\.)/;

export const resolveApiToastMessage = (
  t: (key: string) => string,
  metaKey?: string,
  error?: Pick<Error, "message"> | null,
  fallbackKey?: string,
): string | undefined => {
  // Firestore keeps the code in `code`; the message is only "Missing or insufficient permissions."
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return t("errors.permissionDenied");
  }

  const dynamicMessage = error?.message;

  if (dynamicMessage && DYNAMIC_KEY.test(dynamicMessage)) return t(dynamicMessage);
  if (metaKey) return t(metaKey);
  return fallbackKey ? t(fallbackKey) : undefined;
};

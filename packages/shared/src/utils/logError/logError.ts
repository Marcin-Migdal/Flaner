import type { MutationMeta, QueryKey, QueryMeta } from "@tanstack/react-query";
import { FirebaseError } from "firebase/app";
import { fb } from "../../firebase";

export type LogErrorScope = "query" | "mutation" | "listener" | "global";

export type LogErrorContext = {
  operation?: QueryKey | string;
  meta?: QueryMeta | MutationMeta;
};

// Single structured error log, called only from the global handlers in core (query / mutation cache, window).
// Ids only: never log emails, mutation variables or document contents.
// A failed mutateAsync that nobody catches also rejects as an unhandled promise: the same error object is logged once.
const loggedErrors = new WeakSet<Error>();

export const logError = (scope: LogErrorScope, error: Error, context: LogErrorContext = {}) => {
  if (loggedErrors.has(error)) return;
  loggedErrors.add(error);

  const operation = Array.isArray(context.operation) ? JSON.stringify(context.operation) : context.operation;
  const code = error instanceof FirebaseError ? error.code : undefined;

  console.groupCollapsed(`[flaner] ${scope} failed: ${operation ?? error.message}${code ? ` (${code})` : ""}`);
  console.info({
    operation,
    code,
    message: error.message,
    meta: context.meta,
    route: window.location.pathname,
    uid: fb.auth.auth.currentUser?.uid,
    build: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA ?? "dev",
  });
  console.error(error);
  console.groupEnd();
};

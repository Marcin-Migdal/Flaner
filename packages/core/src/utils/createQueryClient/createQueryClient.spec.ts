import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryClient } from "./createQueryClient";

const { logError, failure } = vi.hoisted(() => ({ logError: vi.fn(), failure: vi.fn() }));

vi.mock("@flaner/shared/utils", () => ({ logError, toast: { failure, success: vi.fn() } }));
vi.mock("../../i18n/i18n", () => ({ default: { t: (key: string) => key } }));

describe("createQueryClient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("logs a failing query once with its key and shows a toast", async () => {
    const queryClient = createQueryClient();
    const error = new Error("boom");

    await queryClient.prefetchQuery({ queryKey: ["items", "a"], queryFn: () => Promise.reject(error) });

    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith("query", error, { operation: ["items", "a"], meta: undefined });
    expect(failure).toHaveBeenCalledWith("errors.fetchError");
  });

  it("logs a failing mutation once with its key and shows a toast", async () => {
    const queryClient = createQueryClient();
    const error = new Error("boom");
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationKey: ["addItem"],
      mutationFn: () => Promise.reject(error),
    });

    await mutation.execute(undefined).catch(() => {});

    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith("mutation", error, { operation: ["addItem"], meta: undefined });
    expect(failure).toHaveBeenCalledWith("errors.mutationError");
  });

  it("logs without a toast when access to already loaded data is lost", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(["group", "g1"], { id: "g1" });
    const error = new FirebaseError("permission-denied", "Missing or insufficient permissions.");

    await queryClient.fetchQuery({ queryKey: ["group", "g1"], queryFn: () => Promise.reject(error) }).catch(() => {});

    expect(logError).toHaveBeenCalledTimes(1);
    expect(failure).not.toHaveBeenCalled();
  });
});

import { act, waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { describe, expect, it, vi } from "vitest";
import { USER_NOT_AUTHENTICATED, requireUser, useUserMutation } from "./useUserMutation";

describe("requireUser", () => {
  it("returns the signed-in user and throws the shared error key without one", () => {
    const user = createMockUser();

    expect(requireUser(user)).toBe(user);
    expect(() => requireUser(null)).toThrow(USER_NOT_AUTHENTICATED);
  });
});

describe("useUserMutation", () => {
  it("passes the signed-in user, invalidates the listed keys, then runs the caller's onSuccess", async () => {
    const user = createMockUser({ uid: "user-1" });
    const mutationFn = vi.fn().mockResolvedValue("id-1");
    const onSuccess = vi.fn();
    const { result, queryClient } = renderHookWithProviders(
      () =>
        useUserMutation<string, string>(
          { mutationKey: ["addItem"], mutationFn, invalidates: ({ uid }, name) => [["items", uid], ["search", name]] },
          { onSuccess },
        ),
      { user },
    );
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    act(() => result.current.mutate("milk"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mutationFn).toHaveBeenCalledWith("milk", user);
    expect(invalidateQueries.mock.calls).toEqual([[{ queryKey: ["items", "user-1"] }], [{ queryKey: ["search", "milk"] }]]);
    expect(onSuccess).toHaveBeenCalledWith("id-1", "milk", undefined, expect.anything());
  });

  it("fails with the shared error key and calls nothing when signed out", async () => {
    const mutationFn = vi.fn();
    const { result } = renderHookWithProviders(() => useUserMutation({ mutationKey: ["addItem"], mutationFn }), { user: null });

    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(USER_NOT_AUTHENTICATED);
    expect(mutationFn).not.toHaveBeenCalled();
  });

  it("keeps the mutation key and lets caller options override the meta (global logging / toasts, #73)", async () => {
    const { result, queryClient } = renderHookWithProviders(
      () =>
        useUserMutation(
          { mutationKey: ["addItem"], mutationFn: vi.fn().mockResolvedValue(undefined), meta: { successMessageKey: "a" } },
          { meta: { successMessageKey: "b" } },
        ),
      { user: createMockUser() },
    );

    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [mutation] = queryClient.getMutationCache().getAll();
    expect(mutation.options.mutationKey).toEqual(["addItem"]);
    expect(mutation.meta).toEqual({ successMessageKey: "b" });
  });
});

import { onlineManager } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { FirebaseError } from "firebase/app";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "@flaner/shared/utils";
import { useBudgetWriteErrorToast } from "./useBudgetWriteErrorToast";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => `t(${key})` }) }));
vi.mock("@flaner/shared/utils", () => ({ toast: { failure: vi.fn() } }));

const fallbackKey = "toasts.budget.saveError";

describe("useBudgetWriteErrorToast", () => {
  afterEach(() => {
    onlineManager.setOnline(true);
    vi.clearAllMocks();
  });

  it("shows No connection with a Retry action when the connection is gone", () => {
    const retry = vi.fn();
    const { result } = renderHook(() => useBudgetWriteErrorToast());

    result.current(new FirebaseError("unavailable", "Failed to get document because the client is offline."), {
      retry,
      fallbackKey,
    });

    expect(toast.failure).toHaveBeenCalledWith("t(budget.offline.noConnection)", {
      action: { label: "t(budget.offline.retry)", onClick: retry },
    });
  });

  it("treats any failure while offline as a lost connection", () => {
    onlineManager.setOnline(false);
    const { result } = renderHook(() => useBudgetWriteErrorToast());

    result.current(new Error("boom"), { retry: vi.fn(), fallbackKey });

    expect(toast.failure).toHaveBeenCalledWith("t(budget.offline.noConnection)", expect.anything());
  });

  it("shows a budget error as is and anything else as the fallback", () => {
    const { result } = renderHook(() => useBudgetWriteErrorToast());

    result.current(new Error("planning:errors.budget.monthTooLarge"), { retry: vi.fn(), fallbackKey });
    result.current(new FirebaseError("permission-denied", "Missing permissions"), { retry: vi.fn(), fallbackKey });

    expect(toast.failure).toHaveBeenNthCalledWith(1, "t(planning:errors.budget.monthTooLarge)");
    expect(toast.failure).toHaveBeenNthCalledWith(2, `t(${fallbackKey})`);
  });
});

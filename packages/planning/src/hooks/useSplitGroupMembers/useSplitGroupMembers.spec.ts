import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSplitGroupMembers } from "./useSplitGroupMembers";
import type { SplitGroup } from "../../api/splits";

const mockUser = { uid: "user-1" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../usePlanningTranslations", () => ({
  usePlanningTranslations: () => ({
    t: (key: string) => (key === "splits.you" ? "Ty" : key),
  }),
}));

vi.mock("../api/query", () => ({
  useGetEventParticipantsProfilesQuery: (ids: string[]) => ({
    data: ids.map((id) => ({
      id,
      name: id === "user-1" ? "Alice" : "Bob",
      avatarUrl: undefined,
    })),
    isLoading: false,
  }),
}));

describe("useSplitGroupMembers", () => {
  const mockGroup: SplitGroup = {
    id: "group-1",
    name: "Trip",
    description: "",
    defaultCurrency: "PLN",
    lastUsedCurrency: "PLN",
    createdBy: "user-1",
    participants: ["user-1", "user-2"],
    formerParticipants: ["user-3"],
    balances: {},
    pairBalances: {},
    totalSpent: {},
    expensesCount: 0,
    settlementsCount: 0,
    status: "active",
    createdAt: 1000,
    updatedAt: 1000,
  };

  it("resolves active members and gets member names", () => {
    const { result } = renderHook(() => useSplitGroupMembers(mockGroup));

    expect(result.current.members).toHaveLength(2);
    expect(result.current.members[0].isCurrentUser).toBe(true);
    expect(result.current.members[1].isCurrentUser).toBe(false);

    // Current user gets "Ty"
    expect(result.current.getMemberName("user-1")).toBe("Ty");
    // Other user gets name
    expect(result.current.getMemberName("user-2")).toBe("Bob");

    // Former participant can still be resolved via getMember
    expect(result.current.getMember("user-3").name).toBe("Bob");

    // Unknown participant falls back to unknownUser translation
    expect(result.current.getMember("unknown-id").name).toBe("splits.unknownUser");
  });

  it("handles null group cleanly", () => {
    const { result } = renderHook(() => useSplitGroupMembers(null));
    expect(result.current.members).toHaveLength(0);
  });
});

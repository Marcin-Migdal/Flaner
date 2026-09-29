import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import { FriendsView } from "./FriendsView";

vi.mock("../hooks", () => ({
  useGetFriendsListRealtimeQuery: vi.fn(() => ({
    data: [{ uid: "friend-1", username: "Alice" }],
  })),
}));

vi.mock("../components/InvitationsSheet", () => ({
  InvitationsSheet: () => <div data-testid="invitations-sheet" />,
}));

vi.mock("../components/FriendsTabContent", () => ({
  FriendsTabContent: () => <div data-testid="friends-tab-content">Friends Content</div>,
}));

vi.mock("../components/SearchTabContent", () => ({
  SearchTabContent: () => <div data-testid="search-tab-content">Search Content</div>,
}));

vi.mock("../hooks/useCommunityTranslations", () => ({
  useCommunityTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

describe("FriendsView page", () => {
  it("renders page header, invitations sheet, and switches tabs", async () => {
    const user = userEvent.setup();

    renderWithProviders(<FriendsView />);

    expect(screen.getByText("friends")).toBeInTheDocument();
    expect(screen.getByTestId("invitations-sheet")).toBeInTheDocument();

    const friendsTab = screen.getByRole("tab", { name: /tabs\.friendsList/i });
    const searchTab = screen.getByRole("tab", { name: /tabs\.searchUsers/i });

    expect(friendsTab).toBeInTheDocument();
    expect(searchTab).toBeInTheDocument();

    await user.click(searchTab);
    expect(screen.getByTestId("search-tab-content")).toBeInTheDocument();
  });
});

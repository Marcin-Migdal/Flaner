import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import { InvitationsSheet } from "./InvitationsSheet";
import * as hooks from "../hooks";

vi.mock("@flaner/shared/hooks", () => ({
  useSheet: () => {
    const [open, setOpen] = React.useState(true);
    return [open, { setOpen, open: () => setOpen(true), close: () => setOpen(false), toggle: () => setOpen(!open) }];
  },
}));

vi.mock("../hooks", () => ({
  useGetReceivedFriendRequestRealtimeQuery: vi.fn(),
  useGetSentFriendRequestRealtimeQuery: vi.fn(),
  useAcceptFriendRequestMutation: vi.fn(),
  useRejectFriendRequestMutation: vi.fn(),
  useCancelFriendRequestMutation: vi.fn(),
}));

vi.mock("../hooks/useCommunityTranslations", () => ({
  useCommunityTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

describe("InvitationsSheet component", () => {
  const acceptMutateMock = vi.fn();
  const rejectMutateMock = vi.fn();
  const cancelMutateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hooks.useAcceptFriendRequestMutation).mockReturnValue({
      mutate: acceptMutateMock,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useAcceptFriendRequestMutation>);

    vi.mocked(hooks.useRejectFriendRequestMutation).mockReturnValue({
      mutate: rejectMutateMock,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useRejectFriendRequestMutation>);

    vi.mocked(hooks.useCancelFriendRequestMutation).mockReturnValue({
      mutate: cancelMutateMock,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useCancelFriendRequestMutation>);
  });

  it("renders received and sent requests and triggers mutations on button clicks", async () => {
    const user = userEvent.setup();

    vi.mocked(hooks.useGetReceivedFriendRequestRealtimeQuery).mockReturnValue({
      data: [
        {
          id: "rec-1",
          senderUid: "u-alice",
          senderUsername: "Alice",
          senderAvatarUrl: "",
          receiverUid: "me",
          receiverUsername: "me",
          receiverAvatarUrl: "",
          status: "pending",
          createdAt: 100,
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetReceivedFriendRequestRealtimeQuery>);

    vi.mocked(hooks.useGetSentFriendRequestRealtimeQuery).mockReturnValue({
      data: [
        {
          id: "sent-1",
          receiverUid: "u-bob",
          receiverUsername: "Bob",
          receiverAvatarUrl: "",
          senderUid: "me",
          senderUsername: "me",
          senderAvatarUrl: "",
          status: "pending",
          createdAt: 200,
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetSentFriendRequestRealtimeQuery>);

    renderWithProviders(<InvitationsSheet />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();

    // Accept received
    const acceptBtn = screen.getByRole("button", { name: "invitations.accept" });
    await user.click(acceptBtn);
    expect(acceptMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "u-alice", username: "Alice" })
    );

    // Reject received
    const rejectBtn = screen.getByRole("button", { name: "invitations.reject" });
    await user.click(rejectBtn);
    expect(rejectMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "u-alice", username: "Alice" })
    );

    // Cancel sent
    const cancelBtn = screen.getByRole("button", { name: "invitations.cancel" });
    await user.click(cancelBtn);
    expect(cancelMutateMock).toHaveBeenCalledWith("u-bob");
  });
});

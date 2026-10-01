import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import { GroupInvitationsSheet } from "./GroupInvitationsSheet";
import * as hooks from "../../../hooks";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123" } })),
}));

vi.mock("@flaner/shared/hooks", () => ({
  useSheet: () => {
    const [open, setOpen] = React.useState(true);
    return [open, { setOpen, open: () => setOpen(true), close: () => setOpen(false), toggle: () => setOpen(!open) }];
  },
}));

vi.mock("../../../hooks", () => ({
  useGetUserGroupInvitationsQuery: vi.fn(),
  useGetUsersQuery: vi.fn(),
  useAcceptGroupInvitationMutation: vi.fn(),
  useRejectGroupInvitationMutation: vi.fn(),
}));

vi.mock("../../../hooks/useCommunityTranslations", () => ({
  useCommunityTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

describe("GroupInvitationsSheet component", () => {
  const acceptMutateAsync = vi.fn();
  const rejectMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hooks.useAcceptGroupInvitationMutation).mockReturnValue({
      mutateAsync: acceptMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useAcceptGroupInvitationMutation>);

    vi.mocked(hooks.useRejectGroupInvitationMutation).mockReturnValue({
      mutateAsync: rejectMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useRejectGroupInvitationMutation>);

    vi.mocked(hooks.useGetUsersQuery).mockReturnValue({
      data: [{ uid: "invitor-1", username: "Anna" } as never],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUsersQuery>);
  });

  it("returns null when there are no invitations", () => {
    vi.mocked(hooks.useGetUserGroupInvitationsQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUserGroupInvitationsQuery>);

    const { container } = renderWithProviders(<GroupInvitationsSheet />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders invitations and handles accept action", async () => {
    const user = userEvent.setup();
    const mockInvs = [
      {
        groupId: "g-1",
        groupName: "Hikers Club",
        userId: "user-123",
        invitedByUserId: "invitor-1",
        invitedAt: 1000,
      },
    ];

    vi.mocked(hooks.useGetUserGroupInvitationsQuery).mockReturnValue({
      data: mockInvs,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUserGroupInvitationsQuery>);

    acceptMutateAsync.mockResolvedValueOnce(undefined);

    renderWithProviders(<GroupInvitationsSheet />);

    expect(screen.getByText("Hikers Club")).toBeInTheDocument();
    expect(screen.getByText("Anna")).toBeInTheDocument();

    const acceptBtn = screen.getByRole("button", { name: "groupInvitations.accept" });
    await user.click(acceptBtn);
    expect(acceptMutateAsync).toHaveBeenCalledWith({ groupId: "g-1", userId: "user-123" });
  });

  it("handles reject action", async () => {
    const user = userEvent.setup();
    const mockInvs = [
      {
        groupId: "g-1",
        groupName: "Hikers Club",
        userId: "user-123",
        invitedByUserId: "invitor-1",
        invitedAt: 1000,
      },
    ];

    vi.mocked(hooks.useGetUserGroupInvitationsQuery).mockReturnValue({
      data: mockInvs,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUserGroupInvitationsQuery>);

    rejectMutateAsync.mockResolvedValueOnce(undefined);

    renderWithProviders(<GroupInvitationsSheet />);

    const rejectBtn = screen.getByRole("button", { name: "groupInvitations.reject" });
    await user.click(rejectBtn);
    expect(rejectMutateAsync).toHaveBeenCalledWith({ groupId: "g-1", userId: "user-123" });
  });

  it("does not trigger accept or reject when user is null", async () => {
    const { useAuth } = await import("@flaner/shared/context");
    vi.mocked(useAuth).mockReturnValueOnce({
      user: null,
      claims: null,
      loading: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      getIdToken: vi.fn(),
    });

    const user = userEvent.setup();
    const mockInvs = [
      {
        groupId: "g-1",
        groupName: "Hikers Club",
        userId: "user-123",
        invitedByUserId: "invitor-1",
        invitedAt: 1000,
      },
    ];

    vi.mocked(hooks.useGetUserGroupInvitationsQuery).mockReturnValue({
      data: mockInvs,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUserGroupInvitationsQuery>);

    renderWithProviders(<GroupInvitationsSheet />);

    const acceptBtn = screen.getByRole("button", { name: "groupInvitations.accept" });
    await user.click(acceptBtn);
    expect(acceptMutateAsync).not.toHaveBeenCalled();

    const rejectBtn = screen.getByRole("button", { name: "groupInvitations.reject" });
    await user.click(rejectBtn);
    expect(rejectMutateAsync).not.toHaveBeenCalled();
  });
});


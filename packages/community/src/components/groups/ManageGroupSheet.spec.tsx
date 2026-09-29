import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, createMockGroup } from "@flaner/test-utils";
import { ManageGroupSheet } from "./ManageGroupSheet";
import * as hooks from "../../hooks";
import type { Group } from "../../api/groups";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-owner" } })),
}));

vi.mock("@flaner/shared/hooks", () => ({
  useSheet: () => {
    const [open, setOpen] = React.useState(true);
    return [open, { setOpen, open: () => setOpen(true), close: () => setOpen(false), toggle: () => setOpen(!open) }];
  },
}));

vi.mock("../../hooks", () => ({
  useGetGroupQuery: vi.fn(),
  useGetGroupMembersQuery: vi.fn(),
  useGetUsersQuery: vi.fn(),
  useUpdateGroupMutation: vi.fn(),
  useUpdateGroupMemberRoleMutation: vi.fn(),
  useTransferGroupOwnershipMutation: vi.fn(),
  useRemoveGroupMemberMutation: vi.fn(),
  useDeleteGroupMutation: vi.fn(),
}));

vi.mock("../../hooks/useCommunityTranslations", () => ({
  useCommunityTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

describe("ManageGroupSheet component", () => {
  const updateGroupMutateAsync = vi.fn();
  const deleteGroupMutateAsync = vi.fn();
  const removeMemberMutateAsync = vi.fn();
  const transferOwnershipMutateAsync = vi.fn();
  const updateRoleMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hooks.useUpdateGroupMutation).mockReturnValue({
      mutateAsync: updateGroupMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useUpdateGroupMutation>);

    vi.mocked(hooks.useDeleteGroupMutation).mockReturnValue({
      mutateAsync: deleteGroupMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useDeleteGroupMutation>);

    vi.mocked(hooks.useRemoveGroupMemberMutation).mockReturnValue({
      mutateAsync: removeMemberMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useRemoveGroupMemberMutation>);

    vi.mocked(hooks.useTransferGroupOwnershipMutation).mockReturnValue({
      mutateAsync: transferOwnershipMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useTransferGroupOwnershipMutation>);

    vi.mocked(hooks.useUpdateGroupMemberRoleMutation).mockReturnValue({
      mutateAsync: updateRoleMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useUpdateGroupMemberRoleMutation>);

    const mockGroup = createMockGroup({
      id: "grp-1",
      name: "Alpine Climbers",
      ownerId: "user-owner",
      type: "public",
      description: "We love peaks",
    }) as unknown as Group;

    vi.mocked(hooks.useGetGroupQuery).mockReturnValue({
      data: mockGroup,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetGroupQuery>);

    vi.mocked(hooks.useGetGroupMembersQuery).mockReturnValue({
      data: [
        { userId: "user-owner", role: "owner", joinedAt: 100 },
        { userId: "user-2", role: "member", joinedAt: 200 },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetGroupMembersQuery>);

    vi.mocked(hooks.useGetUsersQuery).mockReturnValue({
      data: [
        { uid: "user-owner", username: "OwnerBob" } as never,
        { uid: "user-2", username: "MemberCharlie" } as never,
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUsersQuery>);
  });

  it("renders group details and submits form when edited", async () => {
    const user = userEvent.setup();
    updateGroupMutateAsync.mockResolvedValueOnce(undefined);

    renderWithProviders(<ManageGroupSheet groupId="grp-1" />);

    expect(screen.getByText("manageGroupSheet.title")).toBeInTheDocument();

    const nameInput = screen.getByLabelText("manageGroupSheet.nameLabel");
    expect(nameInput).toHaveValue("Alpine Climbers");

    await user.clear(nameInput);
    await user.type(nameInput, "New Alpine Club");

    const saveBtn = screen.getByRole("button", { name: "manageGroupSheet.saveChanges" });
    await user.click(saveBtn);

    expect(updateGroupMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "grp-1",
        data: expect.objectContaining({ name: "New Alpine Club" }),
      })
    );
  });

  it("allows group owner to trigger delete group confirmation", async () => {
    const user = userEvent.setup();
    deleteGroupMutateAsync.mockResolvedValueOnce(undefined);

    renderWithProviders(<ManageGroupSheet groupId="grp-1" />);

    const deleteBtn = screen.getByRole("button", { name: "manageGroupSheet.deleteGroupBtn" });
    await user.click(deleteBtn);

    expect(screen.getByText("manageGroupSheet.deleteConfirmTitle")).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "manageGroupSheet.deleteConfirmBtn" });
    await user.click(confirmBtn);

    expect(deleteGroupMutateAsync).toHaveBeenCalledWith("grp-1");
  });
});

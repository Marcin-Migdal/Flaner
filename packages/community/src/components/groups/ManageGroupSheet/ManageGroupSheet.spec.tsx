import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, createMockGroup } from "@flaner/test-utils";
import { ManageGroupSheet } from "./ManageGroupSheet";
import * as hooks from "../../../hooks";
import type { Group } from "../../../api/groups";

import { useFormContext } from "react-hook-form";
import { useAuth } from "@flaner/shared/context";

const mockCompressImage = vi.fn(async (file: File) => file);
const mockUploadToCloudinary = vi.fn(async (_file?: unknown) => "https://cloudinary.com/uploaded.png");

vi.mock("@flaner/shared/utils", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    compressImage: (file: File) => mockCompressImage(file),
    uploadToCloudinary: (file: File) => mockUploadToCloudinary(file),
  };
});

vi.mock("@flaner/ui-components", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    FormImagePicker: ({ name }: { name: string }) => {
      const { setValue } = useFormContext();
      return (
        <button
          type="button"
          data-testid="set-manage-avatar-file"
          onClick={() =>
            setValue(
              name,
              new File(["avatar"], "avatar.png", { type: "image/png" }),
              { shouldDirty: true, shouldValidate: true }
            )
          }
        >
          Set File Avatar
        </button>
      );
    },
  };
});

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-owner" } })),
}));

vi.mock("@flaner/shared/hooks", () => ({
  useSheet: () => {
    const [open, setOpen] = React.useState(true);
    return [open, { setOpen, open: () => setOpen(true), close: () => setOpen(false), toggle: () => setOpen(!open) }];
  },
}));

vi.mock("../../../hooks", () => ({
  useGetGroupQuery: vi.fn(),
  useGetGroupMembersQuery: vi.fn(),
  useGetUsersQuery: vi.fn(),
  useUpdateGroupMutation: vi.fn(),
  useUpdateGroupMemberRoleMutation: vi.fn(),
  useTransferGroupOwnershipMutation: vi.fn(),
  useRemoveGroupMemberMutation: vi.fn(),
  useDeleteGroupMutation: vi.fn(),
}));

vi.mock("../../../hooks/useCommunityTranslations", () => ({
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

  it("handles member actions: role update, transfer ownership, and remove member", async () => {
    const user = userEvent.setup();
    updateRoleMutateAsync.mockResolvedValue(undefined);
    transferOwnershipMutateAsync.mockResolvedValue(undefined);
    removeMemberMutateAsync.mockResolvedValue(undefined);

    vi.mocked(hooks.useGetGroupMembersQuery).mockReturnValue({
      data: [
        { userId: "user-owner", role: "owner", joinedAt: 100 },
        { userId: "user-admin", role: "admin", joinedAt: 150 },
        { userId: "user-mod", role: "moderator", joinedAt: 180 },
        { userId: "user-2", role: "member", joinedAt: 200 },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetGroupMembersQuery>);

    vi.mocked(hooks.useGetUsersQuery).mockReturnValue({
      data: [
        { uid: "user-owner", username: "OwnerBob" } as never,
        { uid: "user-admin", username: "AdminAlex" } as never,
        { uid: "user-mod", username: "ModMike" } as never,
        { uid: "user-2", username: "MemberCharlie" } as never,
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUsersQuery>);

    renderWithProviders(<ManageGroupSheet groupId="grp-1" />);

    // Open members accordion
    const membersTrigger = screen.getByRole("button", { name: /manageGroupSheet\.membersSection/i });
    await user.click(membersTrigger);

    expect(screen.getByText("MemberCharlie")).toBeInTheDocument();

    // Find more options dropdown buttons
    const dropdownButtons = screen.getAllByRole("button").filter((b) => b.querySelector("svg.lucide-ellipsis-vertical"));
    expect(dropdownButtons.length).toBeGreaterThan(0);

    // Click dropdown for user-2 (the last one)
    await user.click(dropdownButtons[dropdownButtons.length - 1]);

    // Promote to Admin
    const promoteAdminItem = screen.getByText("manageGroupSheet.promoteToAdmin");
    await user.click(promoteAdminItem);
    expect(updateRoleMutateAsync).toHaveBeenCalledWith({
      groupId: "grp-1",
      userId: "user-2",
      role: "admin",
    });

    // Re-open dropdown for user-2 to test Transfer Ownership
    await user.click(dropdownButtons[dropdownButtons.length - 1]);
    const transferItem = screen.getByText("manageGroupSheet.transferOwnership");
    await user.click(transferItem);

    expect(screen.getByText("manageGroupSheet.transferConfirmTitle")).toBeInTheDocument();
    const transferConfirmBtn = screen.getByRole("button", { name: "manageGroupSheet.transferConfirmBtn" });
    await user.click(transferConfirmBtn);
    expect(transferOwnershipMutateAsync).toHaveBeenCalledWith({
      groupId: "grp-1",
      currentOwnerId: "user-owner",
      newOwnerId: "user-2",
    });

    // Re-open dropdown for user-2 to test Remove Member
    await user.click(dropdownButtons[dropdownButtons.length - 1]);
    const removeItem = screen.getByText("manageGroupSheet.removeMember");
    await user.click(removeItem);

    expect(screen.getByText("manageGroupSheet.removeConfirmTitle")).toBeInTheDocument();
    const removeConfirmBtn = screen.getByRole("button", { name: "manageGroupSheet.removeConfirmBtn" });
    await user.click(removeConfirmBtn);
    expect(removeMemberMutateAsync).toHaveBeenCalledWith({
      groupId: "grp-1",
      userId: "user-2",
    });
  });

  it("handles saving group with a File avatar and handles save error", async () => {
    const user = userEvent.setup();
    updateGroupMutateAsync.mockResolvedValueOnce(undefined);

    renderWithProviders(<ManageGroupSheet groupId="grp-1" />);

    await user.click(screen.getByTestId("set-manage-avatar-file"));
    const saveBtn = screen.getByRole("button", { name: "manageGroupSheet.saveChanges" });
    await user.click(saveBtn);

    expect(mockCompressImage).toHaveBeenCalled();
    expect(mockUploadToCloudinary).toHaveBeenCalled();
    expect(updateGroupMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "grp-1",
        data: expect.objectContaining({ avatarUrl: "https://cloudinary.com/uploaded.png" }),
      })
    );
  });

  it("handles group save failure gracefully", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    updateGroupMutateAsync.mockRejectedValueOnce(new Error("Save failed"));

    renderWithProviders(<ManageGroupSheet groupId="grp-1" />);

    const nameInput = screen.getByLabelText("manageGroupSheet.nameLabel");
    await user.clear(nameInput);
    await user.type(nameInput, "Failed Save Name");

    const saveBtn = screen.getByRole("button", { name: "manageGroupSheet.saveChanges" });
    await user.click(saveBtn);

    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to update group", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it("cancels transfer ownership and remove member confirmation dialogs", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ManageGroupSheet groupId="grp-1" />);

    const membersTrigger = screen.getByRole("button", { name: /manageGroupSheet\.membersSection/i });
    await user.click(membersTrigger);

    const dropdownButtons = screen.getAllByRole("button").filter((b) => b.querySelector("svg.lucide-ellipsis-vertical"));
    expect(dropdownButtons.length).toBeGreaterThan(0);

    // Open transfer ownership and cancel
    await user.click(dropdownButtons[dropdownButtons.length - 1]);
    await user.click(screen.getByText("manageGroupSheet.transferOwnership"));
    expect(screen.getByText("manageGroupSheet.transferConfirmTitle")).toBeInTheDocument();

    const cancelTransferBtn = screen.getAllByRole("button", { name: "groupDetails.cancelBtn" })[0];
    await user.click(cancelTransferBtn);
    expect(transferOwnershipMutateAsync).not.toHaveBeenCalled();

    // Open remove member and cancel
    await user.click(dropdownButtons[dropdownButtons.length - 1]);
    await user.click(screen.getByText("manageGroupSheet.removeMember"));
    expect(screen.getByText("manageGroupSheet.removeConfirmTitle")).toBeInTheDocument();

    const cancelRemoveBtn = screen.getAllByRole("button", { name: "groupDetails.cancelBtn" })[0];
    await user.click(cancelRemoveBtn);
    expect(removeMemberMutateAsync).not.toHaveBeenCalled();
  });

  it("handles role operations when user is not a member of the group", async () => {
    vi.mocked(useAuth).mockReturnValueOnce({
      user: { uid: "non-member-stranger" },
    } as unknown as ReturnType<typeof useAuth>);

    renderWithProviders(<ManageGroupSheet groupId="grp-1" />);

    expect(screen.getByText("manageGroupSheet.title")).toBeInTheDocument();
  });

  it("handles error during role update silently", async () => {
    const user = userEvent.setup();
    updateRoleMutateAsync.mockRejectedValueOnce(new Error("Update role failed"));

    renderWithProviders(<ManageGroupSheet groupId="grp-1" />);

    const membersTrigger = screen.getByRole("button", { name: /manageGroupSheet\.membersSection/i });
    await user.click(membersTrigger);

    const dropdownButtons = screen.getAllByRole("button").filter((b) => b.querySelector("svg.lucide-ellipsis-vertical"));
    await user.click(dropdownButtons[dropdownButtons.length - 1]);
    await user.click(screen.getByText("manageGroupSheet.promoteToAdmin"));

    expect(updateRoleMutateAsync).toHaveBeenCalled();
  });

  it("handles error during transfer ownership silently", async () => {
    const user = userEvent.setup();
    transferOwnershipMutateAsync.mockRejectedValueOnce(new Error("Transfer failed"));

    renderWithProviders(<ManageGroupSheet groupId="grp-1" />);

    const membersTrigger = screen.getByRole("button", { name: /manageGroupSheet\.membersSection/i });
    await user.click(membersTrigger);

    const dropdownButtons = screen.getAllByRole("button").filter((b) => b.querySelector("svg.lucide-ellipsis-vertical"));
    await user.click(dropdownButtons[dropdownButtons.length - 1]);
    await user.click(screen.getByText("manageGroupSheet.transferOwnership"));
    await user.click(screen.getByRole("button", { name: "manageGroupSheet.transferConfirmBtn" }));

    expect(transferOwnershipMutateAsync).toHaveBeenCalled();
  });

  it("handles error during remove member silently", async () => {
    const user = userEvent.setup();
    removeMemberMutateAsync.mockRejectedValueOnce(new Error("Remove failed"));

    renderWithProviders(<ManageGroupSheet groupId="grp-1" />);

    const membersTrigger = screen.getByRole("button", { name: /manageGroupSheet\.membersSection/i });
    await user.click(membersTrigger);

    const dropdownButtons = screen.getAllByRole("button").filter((b) => b.querySelector("svg.lucide-ellipsis-vertical"));
    await user.click(dropdownButtons[dropdownButtons.length - 1]);
    await user.click(screen.getByText("manageGroupSheet.removeMember"));
    await user.click(screen.getByRole("button", { name: "manageGroupSheet.removeConfirmBtn" }));

    expect(removeMemberMutateAsync).toHaveBeenCalled();
  });

  it("renders loading indicator when members or profiles are loading", async () => {
    const user = userEvent.setup();
    vi.mocked(hooks.useGetUsersQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof hooks.useGetUsersQuery>);

    renderWithProviders(<ManageGroupSheet groupId="grp-1" />);

    const membersTrigger = screen.getByRole("button", { name: /manageGroupSheet\.membersSection/i });
    await user.click(membersTrigger);

    expect(await screen.findByText("groupDetails.loading")).toBeInTheDocument();
  });

  it("handles group with Timestamp updatedAt and member with avatarUrl", async () => {
    const user = userEvent.setup();
    const mockGroupWithTimestamp = createMockGroup({
      id: "grp-1",
      ownerId: "user-owner",
      updatedAt: { toMillis: () => 1700000000 } as never,
    });

    vi.mocked(hooks.useGetGroupQuery).mockReturnValue({
      data: mockGroupWithTimestamp,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetGroupQuery>);

    vi.mocked(hooks.useGetUsersQuery).mockReturnValue({
      data: [
        { uid: "user-owner", username: "OwnerAlice", avatarUrl: "https://example.com/alice.jpg" },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUsersQuery>);

    renderWithProviders(<ManageGroupSheet groupId="grp-1" />);

    const membersTrigger = screen.getByRole("button", { name: /manageGroupSheet\.membersSection/i });
    await user.click(membersTrigger);

    expect(await screen.findByText("OwnerAlice")).toBeInTheDocument();
  });

  it("handles member without user profile in membersProfiles gracefully", async () => {
    const user = userEvent.setup();
    vi.mocked(hooks.useGetUsersQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUsersQuery>);

    renderWithProviders(<ManageGroupSheet groupId="grp-1" />);

    const membersTrigger = screen.getByRole("button", { name: /manageGroupSheet\.membersSection/i });
    await user.click(membersTrigger);

    expect(await screen.findByText("user-owner")).toBeInTheDocument();
  });
});


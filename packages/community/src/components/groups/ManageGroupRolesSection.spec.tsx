import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, createMockGroup } from "@flaner/test-utils";
import { ManageGroupRolesSection } from "./ManageGroupRolesSection";
import * as mutations from "../../hooks/api/mutation";
import type { Group } from "../../api/groups";

vi.mock("../../hooks/api/mutation", () => ({
  useUpdateGroupRolePermissionsMutation: vi.fn(),
}));

vi.mock("../../hooks/useCommunityTranslations", () => ({
  useCommunityTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

describe("ManageGroupRolesSection component", () => {
  const mutateAsyncMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mutations.useUpdateGroupRolePermissionsMutation).mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    } as unknown as ReturnType<typeof mutations.useUpdateGroupRolePermissionsMutation>);
  });

  it("renders role tabs and permissions switches, and saves modified permissions", async () => {
    const user = userEvent.setup();
    const mockGroup = createMockGroup({ id: "grp-1" }) as unknown as Group;
    mutateAsyncMock.mockResolvedValueOnce(undefined);

    renderWithProviders(<ManageGroupRolesSection groupId="grp-1" group={mockGroup} />);

    expect(screen.getByText("manageGroupSheet.role_admin")).toBeInTheDocument();
    expect(screen.getByText("manageGroupSheet.role_moderator")).toBeInTheDocument();
    expect(screen.getByText("manageGroupSheet.role_member")).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: "manageGroupSheet.savePermissions" });
    expect(saveBtn).toBeDisabled();

    // Toggle a checkbox to make dirty
    const switches = screen.getAllByRole("checkbox");
    await user.click(switches[0]);

    expect(saveBtn).toBeEnabled();

    await user.click(saveBtn);

    expect(mutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "grp-1",
        rolePermissions: expect.any(Object),
      })
    );
  });
});

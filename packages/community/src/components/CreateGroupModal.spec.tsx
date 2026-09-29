import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import { CreateGroupModal } from "./CreateGroupModal";

const mockMutateAsync = vi.fn();

vi.mock("../hooks", () => ({
  useCreateGroupMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

describe("CreateGroupModal component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const getSubmitButton = () => {
    return screen.getByRole("button", { name: /groupsview\.createmodal\.submit/i });
  };

  it("does not render dialog content when open is false", () => {
    const onOpenChangeMock = vi.fn();
    renderWithProviders(<CreateGroupModal open={false} onOpenChange={onOpenChangeMock} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders modal form when open is true", () => {
    const onOpenChangeMock = vi.fn();
    renderWithProviders(<CreateGroupModal open={true} onOpenChange={onOpenChangeMock} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/groupsview\.createmodal\.nameplaceholder/i)).toBeInTheDocument();
    expect(getSubmitButton()).toBeInTheDocument();
  });

  it("validates that group name requires at least 3 characters and prevents submit", async () => {
    const user = userEvent.setup();
    const onOpenChangeMock = vi.fn();
    renderWithProviders(<CreateGroupModal open={true} onOpenChange={onOpenChangeMock} />);

    const submitBtn = getSubmitButton();
    const nameInput = screen.getByPlaceholderText(/groupsview\.createmodal\.nameplaceholder/i);

    // Type only 2 characters
    await user.type(nameInput, "AB");
    await user.click(submitBtn);

    // Mutation should not be called due to zod min(3) validation
    await waitFor(() => {
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
    expect(onOpenChangeMock).not.toHaveBeenCalled();
  });

  it("successfully submits the form and closes modal with valid input", async () => {
    const user = userEvent.setup();
    const onOpenChangeMock = vi.fn();
    mockMutateAsync.mockResolvedValueOnce("new-group-id");

    renderWithProviders(<CreateGroupModal open={true} onOpenChange={onOpenChangeMock} />);

    const nameInput = screen.getByPlaceholderText(/groupsview\.createmodal\.nameplaceholder/i);
    await user.type(nameInput, "Himalaya Trekkers");

    const submitBtn = getSubmitButton();
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Himalaya Trekkers",
          type: "private",
          requiresApproval: false,
        })
      );
    });

    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });
});

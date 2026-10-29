import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import { CreateGroupModal } from "./CreateGroupModal";

import { useFormContext } from "react-hook-form";

const mockMutateAsync = vi.fn();
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
        <div>
          <button
            type="button"
            data-testid="set-file-avatar"
            onClick={() => setValue(name, new File(["avatar"], "avatar.png", { type: "image/png" }), { shouldValidate: true })}
          >
            Set File Avatar
          </button>
          <button
            type="button"
            data-testid="set-string-avatar"
            onClick={() => setValue(name, "https://example.com/existing.png", { shouldValidate: true })}
          >
            Set String Avatar
          </button>
        </div>
      );
    },
  };
});

vi.mock("../../hooks", () => ({
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

  it("calls onOpenChange(false) when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChangeMock = vi.fn();

    renderWithProviders(<CreateGroupModal open={true} onOpenChange={onOpenChangeMock} />);

    const cancelBtn = screen.getByRole("button", { name: /groupsview\.createmodal\.cancel/i });
    await user.click(cancelBtn);

    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });

  it("handles mutation failure gracefully", async () => {
    const user = userEvent.setup();
    const onOpenChangeMock = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockMutateAsync.mockRejectedValueOnce(new Error("Network error"));

    renderWithProviders(<CreateGroupModal open={true} onOpenChange={onOpenChangeMock} />);

    const nameInput = screen.getByPlaceholderText(/groupsview\.createmodal\.nameplaceholder/i);
    await user.type(nameInput, "Failed Group");

    const submitBtn = getSubmitButton();
    await user.click(submitBtn);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to create group", expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it("submits form with a File avatar compressed and uploaded to Cloudinary", async () => {
    const user = userEvent.setup();
    const onOpenChangeMock = vi.fn();
    mockMutateAsync.mockResolvedValueOnce("new-group-id");

    renderWithProviders(<CreateGroupModal open={true} onOpenChange={onOpenChangeMock} />);

    const nameInput = screen.getByPlaceholderText(/groupsview\.createmodal\.nameplaceholder/i);
    await user.type(nameInput, "Group with File Avatar");

    await user.click(screen.getByTestId("set-file-avatar"));
    await user.click(getSubmitButton());

    await waitFor(() => {
      expect(mockCompressImage).toHaveBeenCalled();
      expect(mockUploadToCloudinary).toHaveBeenCalled();
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Group with File Avatar",
          avatarUrl: "https://cloudinary.com/uploaded.png",
        })
      );
    });
  });

  it("submits form with an existing string avatarUrl", async () => {
    const user = userEvent.setup();
    const onOpenChangeMock = vi.fn();
    mockMutateAsync.mockResolvedValueOnce("new-group-id");

    renderWithProviders(<CreateGroupModal open={true} onOpenChange={onOpenChangeMock} />);

    const nameInput = screen.getByPlaceholderText(/groupsview\.createmodal\.nameplaceholder/i);
    await user.type(nameInput, "Group with String Avatar");

    await user.click(screen.getByTestId("set-string-avatar"));
    await user.click(getSubmitButton());

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Group with String Avatar",
          avatarUrl: "https://example.com/existing.png",
        })
      );
    });
  });

  it("shows requiresApproval switch when group type is set to public", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce("public-group-id");

    renderWithProviders(<CreateGroupModal open={true} onOpenChange={vi.fn()} />);

    // Click select control to open options
    const selectControl = document.body.querySelector(".react-select__control");
    expect(selectControl).not.toBeNull();
    if (selectControl) {
      await user.click(selectControl);
      const publicOption = await screen.findByText("groupsView.createModal.typePublic");
      await user.click(publicOption);
    }

    // Now requiresApproval switch should appear
    expect(await screen.findByText("groupsView.createModal.requiresApprovalLabel")).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/groupsview\.createmodal\.nameplaceholder/i);
    await user.type(nameInput, "Public Bikers Club");

    const switchInput = screen.getByRole("checkbox");
    await user.click(switchInput);

    await user.click(getSubmitButton());

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Public Bikers Club",
          type: "public",
          requiresApproval: true,
        })
      );
    });
  });
});


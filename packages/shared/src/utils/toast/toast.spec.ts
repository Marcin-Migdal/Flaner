import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast as sonnerToast } from "sonner";
import { toast } from "./toast";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

describe("toast utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls sonnerToast.success with message and options", () => {
    toast.success("Success!", { description: "Item saved", duration: 3000 });
    expect(sonnerToast.success).toHaveBeenCalledWith("Success!", {
      description: "Item saved",
      duration: 3000,
    });
  });

  it("calls sonnerToast.error with message and options", () => {
    toast.failure("Error occurred", { description: "Failed to save" });
    expect(sonnerToast.error).toHaveBeenCalledWith("Error occurred", {
      description: "Failed to save",
      duration: undefined,
    });
  });

  it("calls sonnerToast.warning with message and options", () => {
    toast.attention("Warning!", { description: "Check input" });
    expect(sonnerToast.warning).toHaveBeenCalledWith("Warning!", {
      description: "Check input",
      duration: undefined,
    });
  });

  it("calls sonnerToast direct function for standard messages", () => {
    toast.message("Hello");
    expect(sonnerToast).toHaveBeenCalledWith("Hello", {
      description: undefined,
      duration: undefined,
    });
  });
});

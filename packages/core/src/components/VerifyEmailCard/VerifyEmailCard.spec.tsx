import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
import { toast } from "@flaner/shared/utils";
import { FirebaseError } from "firebase/app";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RESEND_COOLDOWN_SECONDS, VerifyEmailCard } from "./VerifyEmailCard";

const mockResend = vi.fn();
const mockConfirm = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({
    resendVerificationEmail: mockResend,
    confirmEmailVerification: mockConfirm,
    signOutUser: mockSignOut,
  }),
}));

vi.mock("@flaner/shared/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@flaner/shared/utils")>()),
  toast: { success: vi.fn(), failure: vi.fn() },
}));

const i18n = createTestI18n({
  en: {
    auth: {
      "verifyEmail.title": "Confirm your email",
      "verifyEmail.description": "We sent a link to {{email}}.",
      "verifyEmail.confirmButton": "I've confirmed",
      "verifyEmail.notConfirmed": "Not confirmed yet",
      "verifyEmail.resendButton": "Resend email",
      "verifyEmail.resendCooldown": "Resend in {{seconds}} s",
      "verifyEmail.resent": "Sent",
      "verifyEmail.resendFailed": "Send failed",
      "verifyEmail.tooManyRequests": "Too many",
      "verifyEmail.useAnotherAccount": "Use a different account",
    },
  },
});

const renderCard = () => renderWithProviders(<VerifyEmailCard email="late@flaner.app" language="pl" />, { i18nInstance: i18n });

describe("VerifyEmailCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResend.mockResolvedValue(undefined);
    mockConfirm.mockResolvedValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows the address the link was sent to", () => {
    renderCard();
    expect(screen.getByRole("alert")).toHaveTextContent("We sent a link to late@flaner.app.");
  });

  it("re-sends the email in the page language and then blocks the button for the cooldown", async () => {
    vi.useFakeTimers();
    renderCard();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Resend email" }));
    });

    expect(mockResend).toHaveBeenCalledWith("pl");
    expect(toast.success).toHaveBeenCalledWith("Sent");
    expect(screen.getByRole("button", { name: `Resend in ${RESEND_COOLDOWN_SECONDS} s` })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("button", { name: `Resend in ${RESEND_COOLDOWN_SECONDS - 1} s` })).toBeDisabled();
  });

  it("reports a rate-limited resend and keeps the button available", async () => {
    mockResend.mockRejectedValueOnce(new FirebaseError("auth/too-many-requests", "slow down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Resend email" }));

    await waitFor(() => expect(toast.failure).toHaveBeenCalledWith("Too many"));
    expect(screen.getByRole("button", { name: "Resend email" })).toBeEnabled();
  });

  it("tells the user when the email is not confirmed yet", async () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "I've confirmed" }));

    await waitFor(() => expect(toast.failure).toHaveBeenCalledWith("Not confirmed yet"));
  });

  it("checks the verification again when the user comes back to the page", () => {
    renderCard();

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(mockConfirm).toHaveBeenCalled();
  });

  it("signs out to use a different account", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Use a different account" }));

    expect(mockSignOut).toHaveBeenCalled();
  });
});

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockUser, renderWithProviders } from "@flaner/test-utils";
import { useAuth } from "./AuthContext.context";

const Probe = () => {
  const { user, isLoading, signOutUser } = useAuth();
  return (
    <button type="button" onClick={() => void signOutUser()}>
      {isLoading ? "loading" : (user?.username ?? "signed out")}
    </button>
  );
};

describe("useAuth with renderWithProviders", () => {
  it("reads the signed-in user given to renderWithProviders, without mocking the context", () => {
    renderWithProviders(<Probe />, { user: createMockUser({ username: "Alice" }) });

    expect(screen.getByRole("button", { name: "Alice" })).toBeInTheDocument();
  });

  it("renders a signed-out state and lets a spec override the actions", async () => {
    const user = userEvent.setup();
    const signOutUser = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<Probe />, { user: null, auth: { signOutUser } });

    await user.click(screen.getByRole("button", { name: "signed out" }));

    expect(signOutUser).toHaveBeenCalledTimes(1);
  });

  it("throws outside an AuthProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderWithProviders(<Probe />)).toThrow("useAuth must be used within an AuthProvider");
  });
});

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, createTestI18n } from "@flaner/test-utils";
import { toast } from "@flaner/shared/utils";
import { FirebaseError } from "firebase/app";
import { AuthView } from "./AuthView";

const mockSignInWithGoogleUser = vi.fn();
const mockSignInWithEmailUser = vi.fn();
const mockSignUpWithEmailUser = vi.fn();

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({
    signInWithGoogleUser: mockSignInWithGoogleUser,
    signInWithEmailUser: mockSignInWithEmailUser,
    signUpWithEmailUser: mockSignUpWithEmailUser,
  }),
}));

vi.mock("@flaner/shared/utils", async () => {
  const actual = await vi.importActual("@flaner/shared/utils");
  return {
    ...actual,
    toast: {
      success: vi.fn(),
      failure: vi.fn(),
    },
  };
});

describe("AuthView", () => {
  const i18n = createTestI18n({
    en: {
      auth: {
        signInSubtitle: "Zaloguj się, aby kontynuować",
        signUpSubtitle: "Utwórz konto w Flaner",
        googleButton: "Kontynuuj z Google",
        or: "lub",
        emailLabel: "Adres e-mail",
        emailPlaceholder: "twoj@email.com",
        passwordLabel: "Hasło",
        passwordPlaceholderLogin: "Wpisz hasło",
        passwordPlaceholderSignUp: "Minimum 6 znaków",
        usernameLabel: "Nazwa użytkownika",
        usernamePlaceholder: "np. JanKowalski",
        signInButton: "Zaloguj się",
        signUpButton: "Zarejestruj się",
        toggleSignInText: "Masz już konto? ",
        toggleSignUpText: "Nie masz konta? ",
        "errors.loginFailed": "Logowanie nie powiodło się",
        "errors.registrationFailed": "Rejestracja nie powiodła się",
        "errors.googleFailed": "Błąd logowania przez Google",
        "errors.invalidCredentials": "Nieprawidłowy e-mail lub hasło",
        "errors.tooManyRequests": "Zbyt wiele prób logowania",
        "errors.usernameInUse": "Ta nazwa użytkownika jest zajęta",
        "errors.emailInUse": "Ten adres e-mail jest już zajęty",
        "errors.weakPassword": "Hasło jest zbyt słabe",
        "errors.invalidEmail": "Nieprawidłowy format e-mail",
        "validation.emailRequired": "Podaj adres e-mail",
        "validation.emailInvalid": "Niepoprawny format e-mail",
        "validation.passwordRequired": "Podaj hasło",
        "validation.passwordMin": "Hasło musi mieć co najmniej 6 znaków",
        "validation.usernameRequired": "Podaj nazwę użytkownika",
        "validation.usernameMin": "Nazwa musi mieć co najmniej 3 znaki",
        "validation.usernameMax": "Nazwa może mieć maksymalnie 30 znaków",
      },
    },
  });

  it("renders login view with Google sign in button and email/password fields", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuthView />, { i18nInstance: i18n });

    expect(screen.getByText("FLANER")).toBeInTheDocument();
    expect(screen.getByText("Zaloguj się, aby kontynuować")).toBeInTheDocument();

    const googleBtn = screen.getByRole("button", { name: /kontynuuj z google/i });
    await user.click(googleBtn);

    expect(mockSignInWithGoogleUser).toHaveBeenCalledWith("pl");
  });

  it("submits login form with valid credentials", async () => {
    const user = userEvent.setup();
    mockSignInWithEmailUser.mockResolvedValueOnce(undefined);

    renderWithProviders(<AuthView />, { i18nInstance: i18n });

    const emailInput = screen.getByLabelText(/adres e-mail/i);
    const passwordInput = screen.getByLabelText(/hasło/i);

    await user.type(emailInput, "test@flaner.app");
    await user.type(passwordInput, "secret123");

    const submitBtn = screen.getByRole("button", { name: "Zaloguj się" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockSignInWithEmailUser).toHaveBeenCalledWith("test@flaner.app", "secret123");
    });
  });

  it("handles login error with invalid credentials", async () => {
    const user = userEvent.setup();
    const error = new FirebaseError("auth/invalid-credential", "Invalid credentials");
    mockSignInWithEmailUser.mockRejectedValueOnce(error);

    renderWithProviders(<AuthView />, { i18nInstance: i18n });

    await user.type(screen.getByLabelText(/adres e-mail/i), "wrong@flaner.app");
    await user.type(screen.getByLabelText(/hasło/i), "wrongpass");

    await user.click(screen.getByRole("button", { name: "Zaloguj się" }));

    await waitFor(() => {
      expect(screen.getAllByText("Nieprawidłowy e-mail lub hasło").length).toBeGreaterThan(0);
    });
  });

  it("toggles to sign up mode and submits registration", async () => {
    const user = userEvent.setup();
    mockSignUpWithEmailUser.mockResolvedValueOnce(undefined);

    renderWithProviders(<AuthView />, { i18nInstance: i18n });

    const toggleBtn = screen.getByRole("button", { name: "Zarejestruj się" });
    await user.click(toggleBtn);

    expect(screen.getByText("Utwórz konto w Flaner")).toBeInTheDocument();

    const usernameInput = screen.getByLabelText(/nazwa użytkownika/i);
    const emailInput = screen.getByLabelText(/adres e-mail/i);
    const passwordInput = screen.getByLabelText(/hasło/i);

    await user.type(usernameInput, "NewUser");
    await user.type(emailInput, "new@flaner.app");
    await user.type(passwordInput, "strongpassword123");

    // Click submit in signup form
    const signUpSubmit = screen.getAllByRole("button", { name: "Zarejestruj się" })[0];
    await user.click(signUpSubmit);

    await waitFor(() => {
      expect(mockSignUpWithEmailUser).toHaveBeenCalledWith("new@flaner.app", "strongpassword123", "NewUser", "pl");
    });
  });

  it("handles signup error with username in use", async () => {
    const user = userEvent.setup();
    const error = new FirebaseError("app/username-already-in-use", "Username taken");
    mockSignUpWithEmailUser.mockRejectedValueOnce(error);

    renderWithProviders(<AuthView />, { i18nInstance: i18n });

    await user.click(screen.getByRole("button", { name: "Zarejestruj się" }));

    await user.type(screen.getByLabelText(/nazwa użytkownika/i), "ExistingUser");
    await user.type(screen.getByLabelText(/adres e-mail/i), "exists@flaner.app");
    await user.type(screen.getByLabelText(/hasło/i), "strongpassword123");

    const signUpSubmit = screen.getAllByRole("button", { name: "Zarejestruj się" })[0];
    await user.click(signUpSubmit);

    await waitFor(() => {
      expect(screen.getByText("Ta nazwa użytkownika jest zajęta")).toBeInTheDocument();
    });
  });

  it("handles generic Google login error", async () => {
    const user = userEvent.setup();
    mockSignInWithGoogleUser.mockRejectedValueOnce(new Error("Popup closed"));

    renderWithProviders(<AuthView />, { i18nInstance: i18n });

    await user.click(screen.getByRole("button", { name: /kontynuuj z google/i }));

    await waitFor(() => {
      expect(toast.failure).toHaveBeenCalledWith("Błąd logowania przez Google");
    });
  });

  it("handles non-Firebase error and specific Firebase errors on login", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Non-Firebase error
    mockSignInWithEmailUser.mockRejectedValueOnce(new Error("Generic network error"));
    renderWithProviders(<AuthView />, { i18nInstance: i18n });

    await user.type(screen.getByLabelText(/adres e-mail/i), "user@flaner.app");
    await user.type(screen.getByLabelText(/hasło/i), "secret123");
    await user.click(screen.getByRole("button", { name: "Zaloguj się" }));

    await waitFor(() => {
      expect(toast.failure).toHaveBeenCalledWith("Logowanie nie powiodło się");
    });

    // auth/too-many-requests error
    mockSignInWithEmailUser.mockRejectedValueOnce(
      new FirebaseError("auth/too-many-requests", "Too many requests")
    );
    await user.click(screen.getByRole("button", { name: "Zaloguj się" }));
    await waitFor(() => {
      expect(screen.getByText("Zbyt wiele prób logowania")).toBeInTheDocument();
    });

    // Other FirebaseError
    mockSignInWithEmailUser.mockRejectedValueOnce(
      new FirebaseError("auth/internal-error", "Internal error")
    );
    await user.click(screen.getByRole("button", { name: "Zaloguj się" }));
    await waitFor(() => {
      expect(toast.failure).toHaveBeenCalledWith("Logowanie nie powiodło się");
    });

    consoleErrorSpy.mockRestore();
  });

  it("handles non-Firebase error and specific Firebase errors on signup", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderWithProviders(<AuthView />, { i18nInstance: i18n });
    await user.click(screen.getByRole("button", { name: "Zarejestruj się" }));

    const usernameInput = screen.getByLabelText(/nazwa użytkownika/i);
    const emailInput = screen.getByLabelText(/adres e-mail/i);
    const passwordInput = screen.getByLabelText(/hasło/i);
    const signUpSubmit = screen.getAllByRole("button", { name: "Zarejestruj się" })[0];

    await user.type(usernameInput, "TestSignup");
    await user.type(emailInput, "test@flaner.app");
    await user.type(passwordInput, "validpassword123");

    // Non-Firebase error
    mockSignUpWithEmailUser.mockRejectedValueOnce(new Error("Generic signup error"));
    await user.click(signUpSubmit);
    await waitFor(() => {
      expect(toast.failure).toHaveBeenCalledWith("Rejestracja nie powiodła się");
    });

    // auth/email-already-in-use
    mockSignUpWithEmailUser.mockRejectedValueOnce(
      new FirebaseError("auth/email-already-in-use", "Email taken")
    );
    await user.click(signUpSubmit);
    await waitFor(() => {
      expect(screen.getByText("Ten adres e-mail jest już zajęty")).toBeInTheDocument();
    });

    // auth/weak-password
    mockSignUpWithEmailUser.mockRejectedValueOnce(
      new FirebaseError("auth/weak-password", "Weak pass")
    );
    await user.click(signUpSubmit);
    await waitFor(() => {
      expect(screen.getByText("Hasło jest zbyt słabe")).toBeInTheDocument();
    });

    // auth/invalid-email
    mockSignUpWithEmailUser.mockRejectedValueOnce(
      new FirebaseError("auth/invalid-email", "Invalid email")
    );
    await user.click(signUpSubmit);
    await waitFor(() => {
      expect(screen.getByText("Nieprawidłowy format e-mail")).toBeInTheDocument();
    });

    // Other FirebaseError
    mockSignUpWithEmailUser.mockRejectedValueOnce(
      new FirebaseError("auth/internal-error", "Internal error")
    );
    await user.click(signUpSubmit);
    await waitFor(() => {
      expect(toast.failure).toHaveBeenCalledWith("Rejestracja nie powiodła się");
    });

    consoleErrorSpy.mockRestore();
  });
});

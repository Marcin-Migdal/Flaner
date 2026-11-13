import { screen } from "@testing-library/react";
import { createMockUser, renderWithProviders } from "@flaner/test-utils";
import type { UserType } from "@flaner/shared/types";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { Route, Routes } from "react-router";
import { ProtectedRoute, PublicRoute } from "./guards";

let mockUser: UserType | null = null;
let mockIsLoading = false;

const renderRoutes = (ui: ReactElement, initialEntries: string[]) =>
  renderWithProviders(ui, { initialEntries, user: mockUser, auth: { isLoading: mockIsLoading } });

describe("guards", () => {
  describe("ProtectedRoute", () => {
    it("renders loading spinner while auth state is loading", () => {
      mockUser = null;
      mockIsLoading = true;

      const { container } = renderRoutes(
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Protected Content</div>} />
          </Route>
        </Routes>,
        ["/dashboard"],
      );

      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
      expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("redirects to /login when user is not authenticated", () => {
      mockUser = null;
      mockIsLoading = false;

      renderRoutes(
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Protected Content</div>} />
          </Route>
        </Routes>,
        ["/dashboard"],
      );

      expect(screen.getByText("Login Page")).toBeInTheDocument();
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("renders outlet child route when user is authenticated", () => {
      mockUser = createMockUser({ uid: "user-123" });
      mockIsLoading = false;

      renderRoutes(
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Protected Content</div>} />
          </Route>
        </Routes>,
        ["/dashboard"],
      );

      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });

  describe("PublicRoute", () => {
    it("renders loading spinner while auth state is loading", () => {
      mockUser = null;
      mockIsLoading = true;

      const { container } = renderRoutes(
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<div>Public Content</div>} />
          </Route>
        </Routes>,
        ["/login"],
      );

      expect(screen.queryByText("Public Content")).not.toBeInTheDocument();
      expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("redirects to / when user is already authenticated", () => {
      mockUser = createMockUser({ uid: "user-123" });
      mockIsLoading = false;

      renderRoutes(
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<div>Public Content</div>} />
          </Route>
        </Routes>,
        ["/login"],
      );

      expect(screen.getByText("Home Page")).toBeInTheDocument();
      expect(screen.queryByText("Public Content")).not.toBeInTheDocument();
    });

    it("renders outlet child route when user is not authenticated", () => {
      mockUser = null;
      mockIsLoading = false;

      renderRoutes(
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<div>Public Content</div>} />
          </Route>
        </Routes>,
        ["/login"],
      );

      expect(screen.getByText("Public Content")).toBeInTheDocument();
    });
  });
});

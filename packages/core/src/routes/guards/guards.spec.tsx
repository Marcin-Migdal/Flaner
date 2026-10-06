import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { ProtectedRoute, PublicRoute } from "./guards";

let mockUser: { uid: string } | null = null;
let mockIsLoading = false;

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: mockIsLoading,
  }),
}));

describe("guards", () => {
  describe("ProtectedRoute", () => {
    it("renders loading spinner while auth state is loading", () => {
      mockUser = null;
      mockIsLoading = true;

      const { container } = render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
      expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("redirects to /login when user is not authenticated", () => {
      mockUser = null;
      mockIsLoading = false;

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Login Page")).toBeInTheDocument();
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("renders outlet child route when user is authenticated", () => {
      mockUser = { uid: "user-123" };
      mockIsLoading = false;

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });

  describe("PublicRoute", () => {
    it("renders loading spinner while auth state is loading", () => {
      mockUser = null;
      mockIsLoading = true;

      const { container } = render(
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<div>Public Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByText("Public Content")).not.toBeInTheDocument();
      expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("redirects to / when user is already authenticated", () => {
      mockUser = { uid: "user-123" };
      mockIsLoading = false;

      render(
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<div>Public Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Home Page")).toBeInTheDocument();
      expect(screen.queryByText("Public Content")).not.toBeInTheDocument();
    });

    it("renders outlet child route when user is not authenticated", () => {
      mockUser = null;
      mockIsLoading = false;

      render(
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<div>Public Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Public Content")).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, createMockGroup } from "@flaner/test-utils";
import { GroupCard } from "./GroupCard";

const mockNavigate = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("GroupCard component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders group details correctly with fallback initials when no avatar", () => {
    const group = createMockGroup({
      name: "Trekking Club",
      description: "Best hiking trails and tips.",
      type: "public",
      avatarUrl: null,
    });

    renderWithProviders(<GroupCard group={group} />);

    // Shows group name and initials
    expect(screen.getByRole("heading", { name: "Trekking Club" })).toBeInTheDocument();
    expect(screen.getByText("TR")).toBeInTheDocument();
    expect(screen.getByText("Best hiking trails and tips.")).toBeInTheDocument();
  });

  it("renders avatar image when avatarUrl is provided", () => {
    const group = createMockGroup({
      name: "Biking Crew",
      avatarUrl: "https://flaner.app/images/biking.png",
    });

    renderWithProviders(<GroupCard group={group} />);

    const img = screen.getByRole("img", { name: "Biking Crew" });
    expect(img).toHaveAttribute("src", "https://flaner.app/images/biking.png");
  });

  it("navigates to group details page when clicked", async () => {
    const user = userEvent.setup();
    const group = createMockGroup({
      id: "group-target-999",
      name: "Outdoor Fans",
    });

    renderWithProviders(<GroupCard group={group} />);

    const cardButton = screen.getByRole("button", { name: /outdoor fans/i });
    await user.click(cardButton);

    expect(mockNavigate).toHaveBeenCalledWith("group-target-999");
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it("renders private badge and Lock icon when group type is private", () => {
    const group = createMockGroup({
      name: "Secret Society",
      type: "private",
    });

    renderWithProviders(<GroupCard group={group} />);

    expect(screen.getByText("groupsView.card.private")).toBeInTheDocument();
  });

  it("renders noDescription fallback when description is missing", () => {
    const group = createMockGroup({
      name: "No Desc Group",
      description: "",
    });

    renderWithProviders(<GroupCard group={group} />);

    expect(screen.getByText("groupsView.card.noDescription")).toBeInTheDocument();
  });
});

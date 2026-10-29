import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GroupSearchResultItem } from "./GroupSearchResultItem";

describe("GroupSearchResultItem component", () => {
  it("renders public group name and member count", () => {
    render(
      <GroupSearchResultItem
        name="Climbing Club"
        requiresApproval={false}
        membersCount={15}
        publicGroupText="Public group"
        membersCountText="members"
      />
    );

    expect(screen.getByText("Climbing Club")).toBeInTheDocument();
    expect(screen.getByText("Public group")).toBeInTheDocument();
    expect(screen.getByText("15 members")).toBeInTheDocument();
  });

  it("renders private group approval text", () => {
    render(
      <GroupSearchResultItem
        name="Secret Society"
        requiresApproval={true}
        membersCount={3}
        privateGroupText="Requires approval"
        membersCountText="members"
      />
    );

    expect(screen.getByText("Secret Society")).toBeInTheDocument();
    expect(screen.getByText("Requires approval")).toBeInTheDocument();
    expect(screen.getByText("3 members")).toBeInTheDocument();
  });
});

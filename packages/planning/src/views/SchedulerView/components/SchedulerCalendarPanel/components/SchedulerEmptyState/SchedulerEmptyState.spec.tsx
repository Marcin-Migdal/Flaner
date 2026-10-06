import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@flaner/test-utils";
import { SchedulerEmptyState } from "./SchedulerEmptyState";

describe("SchedulerEmptyState", () => {
  it("renders empty state title and description", () => {
    renderWithProviders(<SchedulerEmptyState />);

    expect(screen.getByText("hub.noEvents")).toBeInTheDocument();
    expect(screen.getByText("hub.emptyStateDesc")).toBeInTheDocument();
  });
});

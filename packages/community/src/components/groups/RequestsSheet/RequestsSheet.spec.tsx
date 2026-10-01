import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import { RequestsSheet } from "./RequestsSheet";
import * as hooks from "../../../hooks";

vi.mock("@flaner/shared/hooks", () => ({
  useSheet: () => {
    const [open, setOpen] = React.useState(true);
    return [open, { setOpen, open: () => setOpen(true), close: () => setOpen(false), toggle: () => setOpen(!open) }];
  },
}));

vi.mock("../../../hooks", () => ({
  useGetGroupRequestsQuery: vi.fn(),
  useGetUsersQuery: vi.fn(),
  useAcceptJoinRequestMutation: vi.fn(),
  useRejectJoinRequestMutation: vi.fn(),
}));

vi.mock("../../../hooks/useCommunityTranslations", () => ({
  useCommunityTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

describe("RequestsSheet component", () => {
  const acceptMutateMock = vi.fn();
  const rejectMutateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hooks.useAcceptJoinRequestMutation).mockReturnValue({
      mutate: acceptMutateMock,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useAcceptJoinRequestMutation>);

    vi.mocked(hooks.useRejectJoinRequestMutation).mockReturnValue({
      mutate: rejectMutateMock,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useRejectJoinRequestMutation>);

    vi.mocked(hooks.useGetUsersQuery).mockReturnValue({
      data: [{ uid: "req-user-1", username: "ClimberDan" } as never],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUsersQuery>);
  });

  it("returns null when there are no requests", () => {
    vi.mocked(hooks.useGetGroupRequestsQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetGroupRequestsQuery>);

    const { container } = renderWithProviders(<RequestsSheet groupId="grp-1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders requests list and triggers accept and reject mutations", async () => {
    const user = userEvent.setup();
    vi.mocked(hooks.useGetGroupRequestsQuery).mockReturnValue({
      data: [{ userId: "req-user-1", requestedAt: 100 }],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetGroupRequestsQuery>);

    renderWithProviders(<RequestsSheet groupId="grp-1" />);

    expect(screen.getByText("ClimberDan")).toBeInTheDocument();

    const acceptBtn = screen.getByRole("button", { name: "requestsSheet.accept" });
    await user.click(acceptBtn);
    expect(acceptMutateMock).toHaveBeenCalledWith({ groupId: "grp-1", userId: "req-user-1" });

    const rejectBtn = screen.getByRole("button", { name: "requestsSheet.reject" });
    await user.click(rejectBtn);
    expect(rejectMutateMock).toHaveBeenCalledWith({ groupId: "grp-1", userId: "req-user-1" });
  });
});

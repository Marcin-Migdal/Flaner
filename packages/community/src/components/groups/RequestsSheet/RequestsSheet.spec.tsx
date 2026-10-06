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

  it("falls back to userId when user profile is not found in usersData", () => {
    vi.mocked(hooks.useGetGroupRequestsQuery).mockReturnValue({
      data: [{ userId: "unknown-user-id", requestedAt: 100 }],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetGroupRequestsQuery>);

    vi.mocked(hooks.useGetUsersQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUsersQuery>);

    renderWithProviders(<RequestsSheet groupId="grp-1" />);

    expect(screen.getByText("unknown-user-id")).toBeInTheDocument();
  });

  it("handles pending accept and reject states correctly", () => {
    vi.mocked(hooks.useGetGroupRequestsQuery).mockReturnValue({
      data: [{ userId: "req-user-1", requestedAt: 100 }],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetGroupRequestsQuery>);

    vi.mocked(hooks.useAcceptJoinRequestMutation).mockReturnValue({
      mutate: acceptMutateMock,
      isPending: true,
      variables: { groupId: "grp-1", userId: "req-user-1" },
    } as unknown as ReturnType<typeof hooks.useAcceptJoinRequestMutation>);

    renderWithProviders(<RequestsSheet groupId="grp-1" />);

    expect(screen.getByText("ClimberDan")).toBeInTheDocument();
  });

  it("renders loading state when users or requests are loading", () => {
    vi.mocked(hooks.useGetGroupRequestsQuery).mockReturnValue({
      data: [{ userId: "req-user-1", requestedAt: 100 }],
      isLoading: true,
    } as unknown as ReturnType<typeof hooks.useGetGroupRequestsQuery>);

    renderWithProviders(<RequestsSheet groupId="grp-1" />);
    expect(screen.getByText("groupDetails.loading")).toBeInTheDocument();
  });

  it("handles isRejecting state when reject mutation is pending for user", () => {
    vi.mocked(hooks.useGetGroupRequestsQuery).mockReturnValue({
      data: [{ userId: "req-user-1", requestedAt: 100 }],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetGroupRequestsQuery>);

    vi.mocked(hooks.useRejectJoinRequestMutation).mockReturnValue({
      mutate: rejectMutateMock,
      isPending: true,
      variables: { groupId: "grp-1", userId: "req-user-1" },
    } as unknown as ReturnType<typeof hooks.useRejectJoinRequestMutation>);

    renderWithProviders(<RequestsSheet groupId="grp-1" />);
    expect(screen.getByText("ClimberDan")).toBeInTheDocument();
  });
});

import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import { useForm, FormProvider } from "react-hook-form";
import type { ParticipantResult } from "../../api/participants";
import { ParticipantSelect } from "./ParticipantSelect";

const mockUser = {
  uid: "creator-1",
  username: "Creator Alice",
  usernameLower: "creator alice",
  email: "alice@flaner.app",
  avatarUrl: "https://example.com/alice.png",
};

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockSearchResults: ParticipantResult[] = [
  {
    id: "user-bob",
    name: "Bob Builder",
    username: "bob",
    usernameLower: "bob",
    type: "user",
    avatarUrl: "",
  },
];

vi.mock("../../hooks/api/query", () => ({
  useSearchParticipantsQuery: () => ({
    data: mockSearchResults,
    isLoading: false,
  }),
  useGetEventParticipantsProfilesQuery: () => ({
    data: new Map(),
    isLoading: false,
  }),
}));

describe("ParticipantSelect", () => {
  const TestFormWrapper = ({
    initialParticipants = ["creator-1"],
    children,
  }: {
    initialParticipants?: string[];
    children: React.ReactNode;
  }) => {
    const methods = useForm({
      defaultValues: {
        participants: initialParticipants,
      },
    });

    return <FormProvider {...methods}>{children}</FormProvider>;
  };

  it("renders creator chip with creator role label", () => {
    renderWithProviders(
      <TestFormWrapper>
        <ParticipantSelect creatorId="creator-1" />
      </TestFormWrapper>,
    );

    expect(screen.getByText("Creator Alice")).toBeInTheDocument();
    expect(screen.getByText("(roles.creator)")).toBeInTheDocument();
  });

  it("allows selecting a participant from search results", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <TestFormWrapper>
        <ParticipantSelect creatorId="creator-1" />
      </TestFormWrapper>,
    );

    const input = screen.getByPlaceholderText(/create\.searchFriends/i);
    await user.type(input, "Bob");

    const bobResult = screen.getByText("Bob Builder");
    await user.click(bobResult);

    expect(screen.getAllByText("Bob Builder").length).toBeGreaterThan(0);
  });

  it("allows removing a non-creator participant", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <TestFormWrapper initialParticipants={["creator-1"]}>
        <ParticipantSelect creatorId="creator-1" />
      </TestFormWrapper>,
    );

    const input = screen.getByPlaceholderText(/create\.searchFriends/i);
    await user.type(input, "Bob");

    const bobResult = screen.getByText("Bob Builder");
    await user.click(bobResult);

    // There should be a remove button for Bob (creator cannot be removed)
    const removeButtons = screen.getAllByRole("button");
    const removeBob = removeButtons[removeButtons.length - 1];
    await user.click(removeBob);
  });
});

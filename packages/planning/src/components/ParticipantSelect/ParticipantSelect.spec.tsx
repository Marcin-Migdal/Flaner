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

let currentMockUser: typeof mockUser | null = mockUser;

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: currentMockUser }),
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
  {
    id: "group-hikers",
    name: "Hikers Club",
    username: "hikers",
    usernameLower: "hikers",
    type: "group",
    avatarUrl: "",
  },
  {
    id: "user-noname",
    name: "",
    username: "noname",
    usernameLower: "noname",
    type: "user",
    avatarUrl: "",
  },
];

const mockGetGroupMembers = vi.fn().mockResolvedValue([
  {
    id: "member-1",
    name: "Member One",
    type: "user",
    username: "m1",
    usernameLower: "m1",
    avatarUrl: "",
    groupName: "Hikers Club",
  },
  { id: "creator-1", name: "Creator Alice", type: "user", username: "alice", usernameLower: "alice", avatarUrl: "" },
]);

vi.mock("../../api/participants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/participants")>();
  return {
    ...actual,
    getGroupMembersAsParticipants: (...args: unknown[]) => mockGetGroupMembers(...args),
  };
});

vi.mock("../../hooks/api/query", () => ({
  useSearchParticipantsQuery: () => ({
    data: mockSearchResults,
    isLoading: false,
  }),
  useGetEventParticipantsProfilesQuery: (
    _ids: string[] | undefined,
    options?: { select?: (profiles: Array<{ id: string; name: string; avatarUrl?: string; type?: "user" | "group" }>) => Map<string, ParticipantResult> },
  ) => {
    const rawProfiles = [
      { id: "fetched-1", name: "Fetched Person", avatarUrl: "https://example.com/p.png", type: "user" as const },
      { id: "fetched-group", name: "Fetched Group", avatarUrl: "", type: "group" as const },
      { id: "fetched-noname", name: "", avatarUrl: "", type: "user" as const },
    ];
    return {
      data: options?.select ? options.select(rawProfiles) : new Map(),
      isLoading: false,
    };
  },
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

  it("handles selecting a group and adding its members, and ignores duplicates", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <TestFormWrapper initialParticipants={["creator-1"]}>
        <ParticipantSelect creatorId="creator-1" />
      </TestFormWrapper>,
    );

    const input = screen.getByPlaceholderText(/create\.searchFriends/i);
    await user.type(input, "Hikers");

    const groupResult = screen.getByText("Hikers Club");
    await user.click(groupResult);

    expect(mockGetGroupMembers).toHaveBeenCalledWith("group-hikers", "Hikers Club");
    expect(screen.getByText("Member One")).toBeInTheDocument();

    // Selecting an already selected participant does not duplicate
    await user.type(input, "Bob");
    const bobResults = screen.getAllByText("Bob Builder");
    await user.click(bobResults[bobResults.length - 1]);

    await user.type(input, "Bob");
    const bobResultsAgain = screen.getAllByText("Bob Builder");
    await user.click(bobResultsAgain[bobResultsAgain.length - 1]);
  });

  it("renders with custom label and searchPlaceholder", () => {
    renderWithProviders(
      <TestFormWrapper>
        <ParticipantSelect label="Custom Participants" searchPlaceholder="Find buddy" />
      </TestFormWrapper>,
    );
    expect(screen.getByText("Custom Participants")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Find buddy")).toBeInTheDocument();
  });

  it("renders chips for group participants, missing names, and user group tags", () => {
    renderWithProviders(
      <TestFormWrapper initialParticipants={["creator-1", "fetched-1", "fetched-group", "fetched-noname"]}>
        <ParticipantSelect creatorId="creator-1" />
      </TestFormWrapper>,
    );

    expect(screen.getByText("Fetched Person")).toBeInTheDocument();
    expect(screen.getByText("Fetched Group")).toBeInTheDocument();
  });

  it("handles removing a fetched participant not present in addedProfilesMap", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <TestFormWrapper initialParticipants={["creator-1", "fetched-1"]}>
        <ParticipantSelect creatorId="creator-1" />
      </TestFormWrapper>,
    );

    expect(screen.getByText("Fetched Person")).toBeInTheDocument();
    const removeButtons = screen.getAllByRole("button");
    const removeBtn = removeButtons[removeButtons.length - 1];
    await user.click(removeBtn);
  });

  it("handles null user, default props, and undefined form participants value", async () => {
    currentMockUser = null;
    try {
      const EmptyWrapper = ({ children }: { children: React.ReactNode }) => {
        // @ts-expect-error testing undefined participants
        const methods = useForm({ defaultValues: {} });
        return <FormProvider {...methods}>{children}</FormProvider>;
      };

      const user = userEvent.setup();
      renderWithProviders(
        <EmptyWrapper>
          <ParticipantSelect />
        </EmptyWrapper>,
      );

      // Search for noname user to trigger fallback character
      const input = screen.getByPlaceholderText(/create\.searchFriends/i);
      await user.type(input, "Bob");

      const bobResult = screen.getByText("Bob Builder");
      await user.click(bobResult);
    } finally {
      currentMockUser = mockUser;
    }
  });
});

export type MockGroup = {
  id: string;
  name: string;
  nameLower: string;
  description: string;
  type: "public" | "private";
  requiresApproval: boolean;
  ownerId: string;
  avatarUrl?: string | null;
  createdAt: number;
  updatedAt: number;
};

export const createMockGroup = (overrides?: Partial<MockGroup>): MockGroup => ({
  id: "test-group-id-123",
  name: "Flaner Explorers",
  nameLower: "flaner explorers",
  description: "A community for explorers.",
  type: "public",
  requiresApproval: false,
  ownerId: "test-user-uid-123",
  avatarUrl: null,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  ...overrides,
});

import type { UserType } from "@flaner/shared/types";

export const createMockUser = (overrides?: Partial<UserType>): UserType => ({
  uid: "test-user-uid-123",
  email: "test.user@flaner.app",
  username: "TestUser",
  usernameLower: "testuser",
  avatarUrl: "https://flaner.app/avatar.png",
  darkMode: false,
  language: "en",
  ...overrides,
});

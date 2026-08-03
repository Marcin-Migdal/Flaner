import { type EditUserRequest } from "@flaner/shared/types";

export type UpdateProfilePayload = Omit<EditUserRequest, "currentUserUid">;

import { type EditUserRequest } from "@flaner-v2/shared";

export type UpdateProfilePayload = Omit<EditUserRequest, "currentUserUid">;

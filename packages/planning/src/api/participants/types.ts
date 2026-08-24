export interface BaseParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface UserParticipant extends BaseParticipant {
  type: "user";
  username: string;
  usernameLower: string;
  groupName?: string;
}

export interface GroupParticipant extends BaseParticipant {
  type: "group";
}

export type ParticipantResult = UserParticipant | GroupParticipant;

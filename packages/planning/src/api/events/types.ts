export type VoteType = "yes" | "maybe" | "no";

export type ProposedDateSlot = {
  id?: string;
  start: string;
  end: string;
  color: string;
  votes?: Record<string, VoteType>;
};

export type SchedulerEvent = {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  participants: string[];
  endDate?: string;
  proposedDates: ProposedDateSlot[];
  isFinalized?: boolean;
  finalizedSlotIndex?: number;
  createdAt: number;
  updatedAt: number;
};

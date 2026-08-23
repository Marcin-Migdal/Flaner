import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, useSidebar } from "@flaner/ui-components";
import { format } from "date-fns";
import { Check, X, Loader2 } from "lucide-react";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import type { ParticipantResult } from "../../api/participants";
import type { SchedulerEvent, VoteType } from "../../api/events/types";
import { useVoteSlotMutation } from "../../hooks/api/mutation/useVoteSlotMutation";

export type SlotVotingModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  event: SchedulerEvent | null;
  slotIndex: number | null;
  participantsProfiles: ParticipantResult[];
  currentUserId?: string;
};

export function SlotVotingModal({
  isOpen,
  onOpenChange,
  event,
  slotIndex,
  participantsProfiles,
  currentUserId,
}: SlotVotingModalProps) {
  const { t } = usePlanningTranslations();
  const { mutateAsync: voteSlot, isPending: isVoting } = useVoteSlotMutation();
  const { isMobile } = useSidebar();

  if (!event || slotIndex === null || slotIndex < 0 || !event.proposedDates[slotIndex]) {
    return null;
  }

  const slot = event.proposedDates[slotIndex];
  const votes = slot.votes || {};

  const handleVote = async (vote: VoteType) => {
    if (!currentUserId) return;
    const currentVote = votes[currentUserId];
    // Toggle off if clicked the same vote
    const newVote = currentVote === vote ? null : vote;

    if (isMobile || (typeof window !== "undefined" && window.innerWidth < 768)) {
      onOpenChange(false);
    }

    await voteSlot({
      eventId: event.id,
      slotIndex,
      userId: currentUserId,
      vote: newVote,
    });
  };

  const currentUserVote = currentUserId ? votes[currentUserId] : undefined;

  // Group participants by vote
  const yesParticipants: ParticipantResult[] = [];
  const maybeParticipants: ParticipantResult[] = [];
  const noParticipants: ParticipantResult[] = [];
  const unvotedParticipants: ParticipantResult[] = [];

  participantsProfiles.forEach((profile) => {
    const v = votes[profile.id];
    if (v === "yes") yesParticipants.push(profile);
    else if (v === "maybe") maybeParticipants.push(profile);
    else if (v === "no") noParticipants.push(profile);
    else unvotedParticipants.push(profile);
  });

  const startDateFormatted = format(new Date(slot.start), "MMM dd, yyyy");
  const endDateFormatted = format(new Date(slot.end), "MMM dd, yyyy");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-6 gap-6 bg-background rounded-2xl border shadow-xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: slot.color || "var(--primary)" }}
            />
            <DialogTitle className="text-lg font-bold">
              {startDateFormatted} — {endDateFormatted}
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            {event.name}
          </p>
        </DialogHeader>

        {/* Voting Buttons */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("voting.yourVote")}
          </span>

          <div className="grid grid-cols-3 gap-3">
            <Button
              type="button"
              variant="outline"
              className={`h-11 flex flex-col items-center justify-center gap-1 font-semibold rounded-xl border bg-clip-border transition-all ${
                currentUserVote === "yes"
                  ? "bg-vote-yes hover:bg-vote-yes-hover text-white border-vote-yes-border/60 shadow-md scale-[1.02]"
                  : "hover:border-vote-yes-border/50 hover:bg-vote-yes-tint text-vote-yes-text border-border/60"
              }`}
              onClick={() => handleVote("yes")}
              disabled={isVoting}
            >
              <div className="flex items-center gap-1.5 text-xs">
                {isVoting && currentUserVote !== "yes" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                )}
                {t("voting.yes")}
              </div>
            </Button>

            <Button
              type="button"
              variant="outline"
              className={`h-11 flex flex-col items-center justify-center gap-1 font-semibold rounded-xl border bg-clip-border transition-all ${
                currentUserVote === "maybe"
                  ? "bg-vote-maybe hover:bg-vote-maybe-hover text-white border-vote-maybe-border/60 shadow-md scale-[1.02]"
                  : "hover:border-vote-maybe-border/50 hover:bg-vote-maybe-tint text-vote-maybe-text border-border/60"
              }`}
              onClick={() => handleVote("maybe")}
              disabled={isVoting}
            >
              <div className="flex items-center gap-1.5 text-xs">
                {isVoting && currentUserVote !== "maybe" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span className="font-extrabold text-[13px] leading-none select-none">?</span>
                )}
                {t("voting.maybe")}
              </div>
            </Button>

            <Button
              type="button"
              variant="outline"
              className={`h-11 flex flex-col items-center justify-center gap-1 font-semibold rounded-xl border bg-clip-border transition-all ${
                currentUserVote === "no"
                  ? "bg-vote-no hover:bg-vote-no-hover text-white border-vote-no-border/60 shadow-md scale-[1.02]"
                  : "hover:border-vote-no-border/50 hover:bg-vote-no-tint text-vote-no-text border-border/60"
              }`}
              onClick={() => handleVote("no")}
              disabled={isVoting}
            >
              <div className="flex items-center gap-1.5 text-xs">
                {isVoting && currentUserVote !== "no" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                )}
                {t("voting.no")}
              </div>
            </Button>
          </div>
        </div>

        {/* Participants Breakdown */}
        <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
          {/* Yes Section */}
          {yesParticipants.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-vote-yes-text uppercase tracking-wider flex items-center gap-1">
                <Check className="w-3 h-3 stroke-[3]" />
                {t("voting.yes")} ({yesParticipants.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {yesParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 bg-vote-yes-tint border border-vote-yes-border/30 px-2.5 py-1 rounded-full text-xs font-medium text-vote-yes-text"
                  >
                    <div className="w-4 h-4 rounded-full bg-vote-yes/20 overflow-hidden shrink-0">
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-vote-yes-text">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Maybe Section */}
          {maybeParticipants.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-vote-maybe-text uppercase tracking-wider flex items-center gap-1">
                <span className="font-extrabold text-[12px] leading-none select-none">?</span>
                {t("voting.maybe")} ({maybeParticipants.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {maybeParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 bg-vote-maybe-tint border border-vote-maybe-border/30 px-2.5 py-1 rounded-full text-xs font-medium text-vote-maybe-text"
                  >
                    <div className="w-4 h-4 rounded-full bg-vote-maybe/20 overflow-hidden shrink-0">
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-vote-maybe-text">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Section */}
          {noParticipants.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-vote-no-text uppercase tracking-wider flex items-center gap-1">
                <X className="w-3 h-3 stroke-[3]" />
                {t("voting.no")} ({noParticipants.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {noParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 bg-vote-no-tint border border-vote-no-border/30 px-2.5 py-1 rounded-full text-xs font-medium text-vote-no-text"
                  >
                    <div className="w-4 h-4 rounded-full bg-vote-no/20 overflow-hidden shrink-0">
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-vote-no-text">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unvoted Section */}
          {unvotedParticipants.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {t("voting.unvoted")} ({unvotedParticipants.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {unvotedParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 bg-muted/40 border border-border/50 px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground"
                  >
                    <div className="w-4 h-4 rounded-full bg-muted-foreground/20 overflow-hidden shrink-0">
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-bold">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

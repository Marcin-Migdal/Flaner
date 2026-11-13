import * as z from "zod";
import { isSameDay, startOfDay } from "date-fns";
import { SLOT_COLOR_KEYS } from "../../slotColors";

const slotsSchema = z.array(z.object({ start: z.date(), end: z.date(), color: z.enum(SLOT_COLOR_KEYS) }));

export const getCreateSchedulerSchema = (
  t: (key: string, options?: Record<string, unknown>) => string,
  /** Editing a finalized event: only name and description change, so the other (hidden, possibly past) fields are not checked */
  isFinalized = false,
) =>
  z.object({
    name: z.string().min(1, t("validation.nameRequired")),
    description: z.string().max(300, t("validation.descriptionMax")).optional(),
    endDate: isFinalized ? z.date().optional() : z.date({ message: t("validation.endDateRequired") }),
    participants: z.array(z.string()),
    proposedDates: isFinalized ? slotsSchema : slotsSchema.min(1, t("validation.datesRequired")),
    autoVoteProposedDates: z.boolean().optional(),
  }).superRefine((data, ctx) => {
    if (isFinalized) return;
    const today = startOfDay(new Date());

    if (data.endDate && startOfDay(data.endDate) < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t("validation.endDatePast"),
        path: ["endDate"]
      });
    }

    if (data.proposedDates && data.proposedDates.length > 0) {
      const hasPastProposedDate = data.proposedDates.some((d) => startOfDay(d.start) < today);
      if (hasPastProposedDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("validation.proposedDatePast"),
          path: ["proposedDates"]
        });
      }

      const hasDuplicate = data.proposedDates.some((slot, index) =>
        data.proposedDates.slice(index + 1).some(
          (other) => isSameDay(slot.start, other.start) && isSameDay(slot.end, other.end)
        )
      );
      if (hasDuplicate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("validation.duplicateSlot"),
          path: ["proposedDates"]
        });
      }

      if (data.endDate) {
        const earliestProposed = data.proposedDates.reduce((earliest, current) => {
          return current.start < earliest ? current.start : earliest;
        }, data.proposedDates[0].start);

        if (startOfDay(data.endDate) > startOfDay(earliestProposed)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("validation.endDateAfterProposed"),
            path: ["endDate"]
          });
        }
      }
    }
  });

export type CreateSchedulerFormData = z.infer<ReturnType<typeof getCreateSchedulerSchema>>;
export type ProposedDate = CreateSchedulerFormData["proposedDates"][0];

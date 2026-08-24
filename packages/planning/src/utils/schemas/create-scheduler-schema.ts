import * as z from "zod";
import { isSameDay, startOfDay } from "date-fns";

export const getCreateSchedulerSchema = (t: (key: string, options?: Record<string, unknown>) => string) =>
  z.object({
    name: z.string().min(1, t("validation.nameRequired")),
    description: z.string().max(300, t("validation.descriptionMax")).optional(),
    endDate: z.date({
      message: t("validation.endDateRequired")
    }),
    participants: z.array(z.string()),
    proposedDates: z
      .array(z.object({ start: z.date(), end: z.date(), color: z.string() }))
      .min(1, t("validation.datesRequired")),
  }).superRefine((data, ctx) => {
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

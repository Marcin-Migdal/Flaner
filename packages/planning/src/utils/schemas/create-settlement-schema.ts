import * as z from "zod";
import { hasAtMostTwoDecimals } from "../money";

export const getCreateSettlementSchema = (t: (key: string, options?: Record<string, unknown>) => string) =>
  z
    .object({
      payerId: z.string().min(1, t("splits.validation.payerRequired")),
      receiverId: z.string().min(1, t("splits.validation.receiverRequired")),
      amount: z
        .number({ message: t("splits.validation.amountRequired") })
        .positive(t("splits.validation.amountPositive"))
        .refine(hasAtMostTwoDecimals, t("splits.validation.amountDecimals")),
      currency: z.string().min(1, t("splits.validation.currencyRequired")),
      date: z.date({ message: t("splits.validation.dateRequired") }),
      note: z.string().max(120, t("splits.validation.noteMax")),
    })
    .refine((data) => data.payerId !== data.receiverId, {
      message: t("splits.validation.samePayerReceiver"),
      path: ["receiverId"],
    });

export type CreateSettlementFormData = z.infer<ReturnType<typeof getCreateSettlementSchema>>;

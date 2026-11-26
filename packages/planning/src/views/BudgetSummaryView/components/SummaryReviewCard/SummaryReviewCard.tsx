import { buttonVariants, Card, CardFooter, CardHeader, CardTitle } from "@flaner/ui-components";
import { Link } from "react-router";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import type { ToReviewCount } from "../../../../utils/budgetSummary";
import { summaryReviewCardStyles as styles } from "./SummaryReviewCard.styles";

export type SummaryReviewCardProps = {
  count: ToReviewCount;
  /** Transactions of the month filtered to Unconfirmed. */
  reviewHref: string;
};

/** How many of the month's transactions are unconfirmed or uncategorized, with Review in Transactions. */
export const SummaryReviewCard = ({ count, reviewHref }: SummaryReviewCardProps) => {
  const { t } = usePlanningTranslations();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("budget.summary.review.title")}</CardTitle>
      </CardHeader>
      {count.total > 0 ? (
        <div>
          <p className={styles.count}>{t("budget.summary.review.count", { count: count.total })}</p>
          <p className={styles.split}>
            {t("budget.summary.review.split", { unconfirmed: count.unconfirmed, uncategorized: count.uncategorized })}
          </p>
        </div>
      ) : (
        <p className={styles.split}>{t("budget.summary.review.allClear")}</p>
      )}
      {count.total > 0 && (
        <CardFooter>
          <Link to={reviewHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {t("budget.summary.review.open")}
          </Link>
        </CardFooter>
      )}
    </Card>
  );
};

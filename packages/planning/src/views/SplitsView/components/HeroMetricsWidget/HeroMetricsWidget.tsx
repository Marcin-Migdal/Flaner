import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@flaner/shared/utils";
import type { AmountsByCurrency } from "../../../../api/splits";
import { useMoneyFormatter } from "../../../../hooks/useMoneyFormatter";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import type { UserDebtSummary } from "../../../../utils/splitBalances";
import {
  heroMetricAmountVariants,
  heroMetricCardVariants,
  heroMetricIconVariants,
  heroMetricsWidgetStyles as styles,
} from "./HeroMetricsWidget.styles";

type MetricTone = "positive" | "negative" | "neutral";

type MetricCardProps = {
  label: string;
  amount: string;
  caption: string;
  tone: MetricTone;
  icon: LucideIcon;
  className?: string;
};

const MetricCard = ({ label, amount, caption, tone, icon: Icon, className }: MetricCardProps) => (
  <div className={cn(heroMetricCardVariants({ tone }), className)}>
    <div className={styles.cardHeader}>
      <span className={styles.cardLabel}>{label}</span>
      <div className={heroMetricIconVariants({ tone })}>
        <Icon className={styles.cardIcon} />
      </div>
    </div>
    <span className={heroMetricAmountVariants({ tone })}>{amount}</span>
    <span className={styles.cardCaption}>{caption}</span>
  </div>
);

const getNetTone = (amounts: AmountsByCurrency): MetricTone => {
  const values = Object.values(amounts);
  if (values.length === 0) return "neutral";
  if (values.every((value) => value > 0)) return "positive";
  if (values.every((value) => value < 0)) return "negative";
  return "neutral";
};

export type HeroMetricsWidgetProps = {
  defaultCurrency: string;
  netBalances: AmountsByCurrency;
  totalSpent: AmountsByCurrency;
  debtSummary: UserDebtSummary;
};

export const HeroMetricsWidget = ({ defaultCurrency, netBalances, totalSpent, debtSummary }: HeroMetricsWidgetProps) => {
  const { t } = usePlanningTranslations();
  const { format, formatList } = useMoneyFormatter();
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + 3) % 3);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % 3);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    setTouchStartX(null);
  };

  const isSettled = Object.keys(netBalances).length === 0;
  const signedNet = useMemo(() => {
    if (isSettled) return format(0, defaultCurrency);
    return Object.entries(netBalances)
      .sort(([a], [b]) => (a === defaultCurrency ? -1 : b === defaultCurrency ? 1 : a.localeCompare(b)))
      .map(([currency, amount]) => (amount > 0 ? `+${format(amount, currency)}` : format(amount, currency)))
      .join(" · ");
  }, [isSettled, netBalances, defaultCurrency, format]);

  const totalSpentFormatted = useMemo(
    () => formatList(totalSpent, defaultCurrency),
    [formatList, totalSpent, defaultCurrency],
  );

  const youOweFormatted = useMemo(
    () => formatList(debtSummary.youOwe, defaultCurrency),
    [formatList, debtSummary.youOwe, defaultCurrency],
  );

  const owedToYouFormatted = useMemo(
    () => formatList(debtSummary.owedToYou, defaultCurrency),
    [formatList, debtSummary.owedToYou, defaultCurrency],
  );

  const netTone = useMemo(() => getNetTone(netBalances), [netBalances]);

  return (
    <div className={styles.root} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className={styles.floatingDotsRow}>
        <div className={styles.dotsWrapper}>
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              type="button"
              className={cn(styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive)}
              onClick={() => setActiveIndex(i)}
              aria-label={
                i === 0
                  ? t("splits.hero.netBalance")
                  : i === 1
                    ? t("splits.hero.youOwe")
                    : t("splits.hero.owedToYou")
              }
            />
          ))}
        </div>
      </div>

      <div className={styles.gridWrapper}>
        <section className={styles.grid}>
          <MetricCard
            label={t("splits.hero.netBalance")}
            amount={signedNet}
            caption={
              isSettled
                ? t("splits.hero.settledUp")
                : t("splits.hero.totalSpent", { amount: totalSpentFormatted })
            }
            tone={netTone}
            icon={Wallet}
            className={cn(
              "max-[1079px]:col-start-1 max-[1079px]:row-start-1",
              activeIndex === 0
                ? "max-[1079px]:opacity-100 max-[1079px]:z-1"
                : "max-[1079px]:opacity-0 max-[1079px]:pointer-events-none max-[1079px]:z-0",
              "min-[1080px]:col-span-2 min-[1438px]:col-span-1 min-[1080px]:opacity-100 min-[1080px]:pointer-events-auto",
            )}
          />
          <MetricCard
            label={t("splits.hero.youOwe")}
            amount={youOweFormatted}
            caption={t("splits.hero.youOwePeople", { count: debtSummary.youOweCount })}
            tone={debtSummary.youOweCount > 0 ? "negative" : "neutral"}
            icon={ArrowUpRight}
            className={cn(
              "max-[1079px]:col-start-1 max-[1079px]:row-start-1",
              activeIndex === 1
                ? "max-[1079px]:opacity-100 max-[1079px]:z-1"
                : "max-[1079px]:opacity-0 max-[1079px]:pointer-events-none max-[1079px]:z-0",
              "min-[1080px]:col-span-1 min-[1438px]:col-span-1 min-[1080px]:opacity-100 min-[1080px]:pointer-events-auto",
            )}
          />
          <MetricCard
            label={t("splits.hero.owedToYou")}
            amount={owedToYouFormatted}
            caption={t("splits.hero.owedByPeople", { count: debtSummary.owedToYouCount })}
            tone={debtSummary.owedToYouCount > 0 ? "positive" : "neutral"}
            icon={ArrowDownLeft}
            className={cn(
              "max-[1079px]:col-start-1 max-[1079px]:row-start-1",
              activeIndex === 2
                ? "max-[1079px]:opacity-100 max-[1079px]:z-1"
                : "max-[1079px]:opacity-0 max-[1079px]:pointer-events-none max-[1079px]:z-0",
              "min-[1080px]:col-span-1 min-[1438px]:col-span-1 min-[1080px]:opacity-100 min-[1080px]:pointer-events-auto",
            )}
          />
        </section>

        <button
          type="button"
          className={styles.cardSideNavPrev}
          onClick={handlePrev}
          title={t("splits.hero.prevMetric")}
          aria-label={t("splits.hero.prevMetric")}
        >
          <ChevronLeft className="size-5" />
        </button>

        <button
          type="button"
          className={styles.cardSideNavNext}
          onClick={handleNext}
          title={t("splits.hero.nextMetric")}
          aria-label={t("splits.hero.nextMetric")}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
};

import { Button, ConfirmationPopup } from "@flaner/ui-components";
import { ArrowRightLeft, TriangleAlert } from "lucide-react";
import { useState } from "react";
import type { SplitGroup } from "../../../../api/splits";
import { useConvertSplitGroupCurrencyMutation } from "../../../../hooks/api/mutation";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { currencyConversionBannerStyles as styles } from "./CurrencyConversionBanner.styles";

export type CurrencyConversionBannerProps = {
  group: SplitGroup;
};

export const CurrencyConversionBanner = ({ group }: CurrencyConversionBannerProps) => {
  const { t } = usePlanningTranslations();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { mutateAsync: convertCurrency, isPending } = useConvertSplitGroupCurrencyMutation();

  const hasForeignCurrencies = [...Object.keys(group.totalSpent), ...Object.keys(group.balances)].some(
    (currency) => currency !== group.defaultCurrency,
  );
  if (!hasForeignCurrencies) return null;

  const handleConfirm = async () => {
    await convertCurrency(
      { groupId: group.id, targetCurrency: group.defaultCurrency },
      { onSuccess: () => setIsConfirmOpen(false) },
    );
  };

  return (
    <div className={styles.root}>
      <div className={styles.iconWrapper}>
        <ArrowRightLeft className={styles.icon} />
      </div>
      <div className={styles.body}>
        <span className={styles.title}>{t("splits.conversion.bannerTitle")}</span>
        <span className={styles.description}>
          {t("splits.conversion.bannerDesc", { currency: group.defaultCurrency })}
        </span>
      </div>
      <Button type="button" variant="outline" className={styles.action} onClick={() => setIsConfirmOpen(true)}>
        {t("splits.conversion.action", { currency: group.defaultCurrency })}
      </Button>

      <ConfirmationPopup
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={t("splits.conversion.confirmTitle", { currency: group.defaultCurrency })}
        description={
          <div className={styles.confirmContent}>
            <p className={styles.confirmIntro}>
              {t("splits.conversion.confirmDesc", { currency: group.defaultCurrency })}
            </p>
            <div className={styles.warningBox}>
              <TriangleAlert className={styles.warningIcon} />
              <div className={styles.warningBody}>
                <span className={styles.warningTitle}>{t("splits.conversion.warningTitle")}</span>
                <span className={styles.warningDesc}>
                  {t("splits.conversion.warningDesc", { currency: group.defaultCurrency })}
                </span>
                <span className={styles.historyNote}>{t("splits.conversion.historyNote")}</span>
              </div>
            </div>
          </div>
        }
        confirmLabel={t("splits.conversion.confirm")}
        cancelLabel={t("splits.actions.cancel")}
        onConfirm={handleConfirm}
        isConfirming={isPending}
        variant="warning"
      />
    </div>
  );
};

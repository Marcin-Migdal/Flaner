import type { AppRouteObject } from "@flaner/shared/types";
import { PageTiles } from "@flaner/ui-components";
import { useNavigate, useResolvedPath } from "react-router";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";

export type BudgetTilesViewProps = {
  /** The Budget route's own children (its views). */
  routes: AppRouteObject[];
};

/** `/planning/budget`: tiles of the Budget views. */
export const BudgetTilesView = ({ routes }: BudgetTilesViewProps) => {
  const { t } = usePlanningTranslations();
  const navigate = useNavigate();
  // Index route: "." is the Budget route's own URL
  const { pathname } = useResolvedPath(".");

  return (
    <PageTiles
      title={t("nav.budget")}
      routes={routes}
      basePath={pathname}
      onSelect={(path) => navigate(path)}
      emptyTitle={t("mfe.noViewsTitle", { ns: "common" })}
    />
  );
};

export default BudgetTilesView;

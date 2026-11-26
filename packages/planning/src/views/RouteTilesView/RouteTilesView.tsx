import type { TilesIndexProps } from "@flaner/shared/utils";
import { PageTiles } from "@flaner/ui-components";
import { useTranslation } from "react-i18next";
import { useNavigate, useResolvedPath } from "react-router";

/** Tiles index page of a route with children, added by `withTilesIndex` (e.g. `/planning/budget`). */
export const RouteTilesView = ({ label, routes }: TilesIndexProps) => {
  // Default namespace, like PageTiles' tile labels: the title and the tiles resolve a label the same way
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Index route: "." is the parent route's own URL
  const { pathname } = useResolvedPath(".");

  return (
    <PageTiles
      title={t(label)}
      routes={routes}
      basePath={pathname}
      onSelect={(path) => navigate(path)}
      emptyTitle={t("mfe.noViewsTitle")}
    />
  );
};

export default RouteTilesView;

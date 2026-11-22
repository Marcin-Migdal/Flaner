import type { AppRouteObject } from "@flaner/shared/types";
import { cn, generateNavigation } from "@flaner/shared/utils";
import { LayoutGrid } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../EmptyState";
import { NavIcon } from "../NavIcon";
import { PageHeader } from "../PageHeader";
import { pageTilesStyles } from "./PageTiles.styles";

export type PageTilesProps = {
  title: string;
  /** The given route's own children: each labelled, non-hidden, non-dynamic child becomes a tile (its children don't). */
  routes: AppRouteObject[];
  /** Full URL path of the route whose children are shown, e.g. `/planning/budget`. */
  basePath: string;
  /** Called with the tile's full path. */
  onSelect: (path: string) => void;
  emptyTitle: string;
  emptyDescription?: string;
  className?: string;
};

/** Landing page of a route with children: one tile per child view. Tile labels are translation keys from route handles. */
export function PageTiles({ title, routes, basePath, onSelect, emptyTitle, emptyDescription, className }: PageTilesProps) {
  const { t } = useTranslation();
  const tiles = generateNavigation(routes, basePath, { requireIcon: false });

  return (
    <div data-slot="page-tiles" className={cn(pageTilesStyles.root, className)}>
      <PageHeader className={pageTilesStyles.header} title={title} />

      {tiles.length === 0 ? (
        <EmptyState
          className={pageTilesStyles.empty}
          icon={<LayoutGrid />}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <div className={pageTilesStyles.grid}>
          {tiles.map((tile) => (
            <button type="button" key={tile.path} onClick={() => onSelect(tile.path)} className={pageTilesStyles.tile}>
              {tile.icon ? (
                <div className={pageTilesStyles.icon}>
                  <NavIcon name={tile.icon} aria-hidden="true" />
                </div>
              ) : (
                <div className={pageTilesStyles.iconPlaceholder} />
              )}
              <h3 className={pageTilesStyles.label}>{t(tile.labelKey)}</h3>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

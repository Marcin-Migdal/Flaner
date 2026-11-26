import { cn } from "@flaner/shared/utils";
import {
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@flaner/ui-components";
import { ChevronDown, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { BudgetCategory, BudgetCategoryType, BudgetSubcategory } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { BUDGET_CATEGORY_COLOR_CLASSES, BUDGET_CATEGORY_ICON_COMPONENTS } from "../../../../utils/budgetCategoryIcons";
import { SortableList } from "../SortableList";
import { categoryTreeCardStyles as styles } from "./CategoryTreeCard.styles";

export type CategoryTreeCardProps = {
  type: BudgetCategoryType;
  categories: BudgetCategory[];
  /** Adds a main category (`parent` `null`) or a subcategory of `parent`. */
  onAdd: (parent: BudgetCategory | null) => void;
  /** Edits a main category (`parent` `null`) or a subcategory of `parent`. */
  onEdit: (item: BudgetCategory | BudgetSubcategory, parent: BudgetCategory | null) => void;
  onDelete: (categoryId: string) => void;
  /** Moves a main category (`parentId` `null`) or a subcategory within its parent. */
  onMove: (parentId: string | null, activeId: string, overId: string) => void;
  /** Offline: nothing can be changed. */
  disabled?: boolean;
};

type RowActionsProps = {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
};

const RowActions = ({ name, onEdit, onDelete, disabled }: RowActionsProps) => {
  const { t } = usePlanningTranslations();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("budget.categories.actions", { name })} disabled={disabled}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={styles.menu}>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil aria-hidden="true" />
          {t("budget.categories.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className={styles.destructiveItem}>
          <Trash2 aria-hidden="true" />
          {t("budget.categories.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * One type's category tree (Settings → Categories): rows with a drag handle, the icon tile in the category's colour,
 * name, subcategory count, actions and an expand chevron; expanded, its subcategories (reordered within it) and
 * "Add subcategory".
 */
export const CategoryTreeCard = ({
  type,
  categories,
  onAdd,
  onEdit,
  onDelete,
  onMove,
  disabled = false,
}: CategoryTreeCardProps) => {
  const { t } = usePlanningTranslations();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const titleId = `budget-categories-${type}-title`;

  const toggle = (categoryId: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(categoryId)) next.add(categoryId);
      return next;
    });

  return (
    <section className={styles.root} aria-labelledby={titleId}>
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {t(`budget.categories.${type}Title`)}
        </h2>
        <Button variant="outline" onClick={() => onAdd(null)} disabled={disabled}>
          <Plus aria-hidden="true" />
          {t("budget.categories.add")}
        </Button>
      </div>

      <Card padding="none">
        {categories.length === 0 ? (
          <p className={styles.empty}>{t("budget.categories.empty")}</p>
        ) : (
          <SortableList
            items={categories}
            onMove={(activeId, overId) => onMove(null, activeId, overId)}
            disabled={disabled}
            className={styles.list}
            itemClassName={styles.item}
            renderItem={(category, handle) => {
              const Icon = BUDGET_CATEGORY_ICON_COMPONENTS[category.icon];
              const colorClass = BUDGET_CATEGORY_COLOR_CLASSES[category.color];
              const isOpen = expanded.has(category.id);
              const subListId = `budget-category-${category.id}-subcategories`;
              return (
                <>
                  <div className={styles.row}>
                    {handle}
                    <span className={cn(styles.tile, colorClass)}>
                      <Icon aria-hidden="true" />
                    </span>
                    <span className={styles.text}>
                      <span className={styles.name}>{category.name}</span>
                      <span className={styles.meta}>
                        {t("budget.categories.subcategoryCount", { count: category.subcategories.length })}
                      </span>
                    </span>
                    <RowActions
                      name={category.name}
                      onEdit={() => onEdit(category, null)}
                      onDelete={() => onDelete(category.id)}
                      disabled={disabled}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-expanded={isOpen}
                      aria-controls={subListId}
                      aria-label={t(isOpen ? "budget.categories.collapse" : "budget.categories.expand", {
                        name: category.name,
                      })}
                      onClick={() => toggle(category.id)}
                    >
                      <ChevronDown aria-hidden="true" className={cn(styles.chevron, isOpen && styles.chevronOpen)} />
                    </Button>
                  </div>
                  {isOpen && (
                    <div id={subListId} className={styles.subcategories}>
                      <SortableList
                        items={category.subcategories}
                        onMove={(activeId, overId) => onMove(category.id, activeId, overId)}
                        disabled={disabled}
                        className={styles.list}
                        itemClassName={styles.item}
                        renderItem={(subcategory, subHandle) => (
                          <div className={styles.subRow}>
                            {subHandle}
                            <span className={cn(styles.subTile, colorClass)}>
                              <Icon aria-hidden="true" />
                            </span>
                            <span className={styles.subName}>{subcategory.name}</span>
                            <RowActions
                              name={subcategory.name}
                              onEdit={() => onEdit(subcategory, category)}
                              onDelete={() => onDelete(subcategory.id)}
                              disabled={disabled}
                            />
                          </div>
                        )}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className={styles.addSub}
                        onClick={() => onAdd(category)}
                        disabled={disabled}
                      >
                        <Plus aria-hidden="true" />
                        {t("budget.categories.addSubcategory")}
                      </Button>
                    </div>
                  )}
                </>
              );
            }}
          />
        )}
      </Card>
    </section>
  );
};

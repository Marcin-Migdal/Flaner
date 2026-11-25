import { cn } from "@flaner/shared/utils";
import { Badge, Select, type SelectOption } from "@flaner/ui-components";
import { CircleHelp } from "lucide-react";
import { useMemo } from "react";
import type { BudgetCategoryIcon, BudgetCategoryTree, BudgetCategoryType, ChartColorIndex } from "../../api/budget";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { BUDGET_CATEGORY_COLOR_CLASSES, BUDGET_CATEGORY_ICON_COMPONENTS } from "../../utils/budgetCategoryIcons";
import { categoryPickerStyles as styles } from "./CategoryPicker.styles";

type CategoryOption = SelectOption & {
  icon: BudgetCategoryIcon;
  color: ChartColorIndex;
  /** The main category's name for a subcategory, so searching a category also finds its subcategories. */
  parentName: string | null;
};

export type CategoryPickerProps = {
  tree: BudgetCategoryTree;
  /** Only this type's tree is offered. */
  type: BudgetCategoryType;
  /** A category or subcategory id; `null` (or an id not in the tree) reads as no category. */
  value: string | null;
  onChange: (categoryId: string | null) => void;
  /** The categorization rule's suggestion for the transaction (`matchRule`): marked in the list. */
  suggestedId?: string | null;
  /** Offers clearing the category (default); off where a category is required (e.g. a rule's). */
  clearable?: boolean;
  label?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
  /**
   * `inline` (a list row): the category's icon, then the name opening the searchable list. An unconfirmed category
   * shows "?" on the icon, and clicking the icon confirms it. Needs `aria-label` instead of `label`.
   */
  variant?: "field" | "inline";
  /** `inline`: whether the category is confirmed (no "?"). */
  confirmed?: boolean;
  /** `inline`: confirms the shown category (icon click). */
  onConfirm?: () => void;
  "aria-label"?: string;
};

/** Searchable list of one type's categories and subcategories, each with its category's icon and colour. */
export const CategoryPicker = ({
  tree,
  type,
  value,
  onChange,
  suggestedId,
  clearable = true,
  label,
  error,
  disabled,
  id,
  variant = "field",
  confirmed = true,
  onConfirm,
  "aria-label": ariaLabel,
}: CategoryPickerProps) => {
  const { t } = usePlanningTranslations();

  const options = useMemo(
    () =>
      tree[type].flatMap((category): CategoryOption[] => [
        { value: category.id, label: category.name, icon: category.icon, color: category.color, parentName: null },
        ...category.subcategories.map((sub) => ({
          value: sub.id,
          label: sub.name,
          icon: category.icon,
          color: category.color,
          parentName: category.name,
        })),
      ]),
    [tree, type],
  );
  const selected = options.find((option) => option.value === value) ?? null;

  const select = (
    <Select<CategoryOption>
      id={id}
      aria-label={ariaLabel}
      containerClassName={variant === "inline" ? styles.inlineSelect : undefined}
      label={label}
      error={error}
      disabled={disabled}
      options={options}
      value={selected}
      onChange={(option) => onChange(option ? option.value : null)}
      placeholder={t("budget.categoryPicker.placeholder")}
      noOptionsMessage={() => t("budget.categoryPicker.noResults")}
      isClearable={clearable}
      isSearchable
      filterOption={({ data }, input) => {
        const query = input.trim().toLowerCase();
        return !query || [data.label, data.parentName ?? ""].some((name) => name.toLowerCase().includes(query));
      }}
      formatOptionLabel={(option, { context }) => {
        const Icon = BUDGET_CATEGORY_ICON_COMPONENTS[option.icon];
        return (
          <span className={cn(styles.option, context === "menu" && option.parentName && styles.subOption)}>
            {/* Inline, the icon is shown (and clickable) beside the select */}
            {!(variant === "inline" && context === "value") && (
              <Icon aria-hidden="true" className={cn(styles.icon, BUDGET_CATEGORY_COLOR_CLASSES[option.color])} />
            )}
            <span className={styles.label}>
              {context === "value" && option.parentName ? `${option.parentName} / ${option.label}` : option.label}
            </span>
            {context === "menu" && option.value === suggestedId && (
              <Badge variant="neutral" size="sm" className={styles.suggestion}>
                {t("budget.categoryPicker.suggested")}
              </Badge>
            )}
          </span>
        );
      }}
    />
  );

  if (variant === "field") return select;

  const Icon = selected ? BUDGET_CATEGORY_ICON_COMPONENTS[selected.icon] : CircleHelp;
  const iconClass = cn(styles.icon, selected ? BUDGET_CATEGORY_COLOR_CLASSES[selected.color] : styles.uncategorizedIcon);
  // Only a set category can be confirmed; Uncategorized is fixed by picking one
  const canConfirm = !!selected && !confirmed;

  return (
    <span className={styles.inline}>
      {canConfirm ? (
        <button
          type="button"
          className={styles.inlineIcon}
          disabled={disabled}
          onClick={onConfirm}
          aria-label={t("budget.categoryPicker.confirm", { category: selected.label })}
          title={t("budget.categoryPicker.confirm", { category: selected.label })}
        >
          <Icon aria-hidden="true" className={iconClass} />
          <span aria-hidden="true" className={styles.unconfirmedMark}>
            ?
          </span>
        </button>
      ) : (
        <span className={styles.inlineIcon}>
          <Icon aria-hidden="true" className={iconClass} />
        </span>
      )}
      {select}
    </span>
  );
};

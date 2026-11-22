import { cn } from "@flaner/shared/utils";
import { Select, type SelectOption } from "@flaner/ui-components";
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
  label?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
};

/** Searchable list of one type's categories and subcategories, each with its category's icon and colour. */
export const CategoryPicker = ({ tree, type, value, onChange, label, error, disabled, id }: CategoryPickerProps) => {
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

  return (
    <Select<CategoryOption>
      id={id}
      label={label}
      error={error}
      disabled={disabled}
      options={options}
      value={selected}
      onChange={(option) => onChange(option ? option.value : null)}
      placeholder={t("budget.categoryPicker.placeholder")}
      noOptionsMessage={() => t("budget.categoryPicker.noResults")}
      isClearable
      isSearchable
      filterOption={({ data }, input) => {
        const query = input.trim().toLowerCase();
        return !query || [data.label, data.parentName ?? ""].some((name) => name.toLowerCase().includes(query));
      }}
      formatOptionLabel={(option, { context }) => {
        const Icon = BUDGET_CATEGORY_ICON_COMPONENTS[option.icon];
        return (
          <span className={cn(styles.option, context === "menu" && option.parentName && styles.subOption)}>
            <Icon aria-hidden="true" className={cn(styles.icon, BUDGET_CATEGORY_COLOR_CLASSES[option.color])} />
            <span className={styles.label}>
              {context === "value" && option.parentName ? `${option.parentName} / ${option.label}` : option.label}
            </span>
          </span>
        );
      }}
    />
  );
};

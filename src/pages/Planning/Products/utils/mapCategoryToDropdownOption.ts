import { DropdownStringOption } from "@marcin-migdal/m-component-library/build/components/Inputs/Dropdown/types";
import { ProductCategory } from "@services/ProductCategories";

export const mapCategoryToDropdownOption = (category: ProductCategory): DropdownStringOption => ({
  label: category.name,
  value: category.id,
});

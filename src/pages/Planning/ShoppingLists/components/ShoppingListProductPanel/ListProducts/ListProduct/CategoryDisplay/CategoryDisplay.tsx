import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { Icon } from "@marcin-migdal/m-component-library";

import { ShoppingListProduct } from "@services/ShoppingListsProduct";

import "./styles.scss";

type CategoryDisplayProps = {
  category: ShoppingListProduct["category"];
};

export const CategoryDisplay = ({ category }: CategoryDisplayProps) => {
  return (
    <div className="shopping-list-product-category-container">
      <div className="shopping-list-product-category">
        <Icon style={{ color: category.color }} icon={category.icon as IconProp} />
        <span style={{ color: category.color }} className="shopping-list-product-category-name">
          {category.name}
        </span>
      </div>
    </div>
  );
};

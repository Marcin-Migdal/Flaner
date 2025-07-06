import { Button, Dropdown, DropdownStringOption } from "@marcin-migdal/m-component-library";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ContentWrapper, MessagePlaceholder } from "@components";
import { useAppSelector, useBreakpoint } from "@hooks";
import { useGetProductCategoriesQuery } from "@services/ProductCategories";
import { useGetShoppingListProductsQuery } from "@services/ShoppingListsProduct";
import { selectAuthorization } from "@slices";
import { arrToDropdownOptions } from "@utils/helpers";

import { AddShoppingListProductAlert } from "../AddShoppingListProductAlert/AddShoppingListProductAlert";
import { ListProducts } from "./ListProducts/ListProducts";

type ShoppingListProductsPanelProps = {
  selectedShoppingListId: string | null;
  handleOpenSidePanel: () => void;
  disableShoppingListsPanel: boolean;
};

export const ShoppingListProductsPanel = ({
  selectedShoppingListId,
  handleOpenSidePanel,
  disableShoppingListsPanel,
}: ShoppingListProductsPanelProps) => {
  const { authUser } = useAppSelector(selectAuthorization);
  const { t } = useTranslation();
  const isMobile = useBreakpoint(`(max-width: 768px)`);

  const [categoryFilter, setCategoryFilter] = useState<DropdownStringOption | null>(null);

  const productCategoriesQuery = useGetProductCategoriesQuery({ currentUserUid: authUser?.uid });

  const shoppingListProductsQuery = useGetShoppingListProductsQuery(
    { shoppingListId: selectedShoppingListId, categoryId: categoryFilter?.value },
    { skip: !selectedShoppingListId }
  );

  const categoryOptions = arrToDropdownOptions(productCategoriesQuery.data, "name", "id");

  const handleCategoryFilterChange = (value: DropdownStringOption | null) => {
    setCategoryFilter(value);
  };

  return (
    <div style={{ overflowY: "auto" }} className="flex flex-column h-100-percent">
      <div className="flex g-2-rem">
        <Dropdown
          placeholder={t("products.category")}
          value={categoryFilter}
          classNamesObj={{ containerClassName: isMobile ? undefined : "w-240-px" }}
          options={categoryOptions}
          onChange={(_event, value) => handleCategoryFilterChange(value)}
          onClear={(_event, value) => handleCategoryFilterChange(value)}
          clearable
          disabled={!productCategoriesQuery.isSuccess || productCategoriesQuery.data.length === 0}
        />
        <AddShoppingListProductAlert shoppingListId={selectedShoppingListId} />
        <Button
          disabled={disableShoppingListsPanel}
          icon="shopping-cart"
          disableDefaultMargin
          display={isMobile}
          onClick={handleOpenSidePanel}
        />
      </div>
      <ContentWrapper
        query={shoppingListProductsQuery}
        placeholders={{
          isUninitialized: <MessagePlaceholder message={t("shoppingLists.selectShoppingList")} />,
          noData: <MessagePlaceholder message={t("shoppingLists.noProducts")} />,
        }}
      >
        {({ data: products }) => <ListProducts products={products} selectedShoppingListId={selectedShoppingListId} />}
      </ContentWrapper>
    </div>
  );
};

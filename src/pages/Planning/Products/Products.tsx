import { Textfield, TextFieldChangeEvent } from "@marcin-migdal/m-component-library";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ContentWrapper } from "@components";
import { useAppSelector } from "@hooks";
import { ProductCategory, useGetProductCategoriesQuery } from "@services/ProductCategories";
import { selectAuthorization } from "@slices";

import { AddCategoryAlert } from "./components/AddCategoryAlert/AddCategoryAlert";
import { Category } from "./components/Category/Category";

import "./styles.scss";

const filterProductCategories = (
  categories: ProductCategory[] | undefined,
  categoryFilter: string
): ProductCategory[] => {
  if (!categories) {
    return [];
  }

  if (categoryFilter.trim().length > 0) {
    return categories.filter((category) =>
      category.name.toLocaleLowerCase().includes(categoryFilter.toLocaleLowerCase())
    );
  } else {
    return categories;
  }
};

const Products = () => {
  const { authUser } = useAppSelector(selectAuthorization);
  const { t } = useTranslation();

  const productCategoriesQuery = useGetProductCategoriesQuery({ currentUserUid: authUser?.uid });

  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const handleChange = (event: TextFieldChangeEvent) => {
    const { value: categoryName } = event.target;

    setCategoryFilter(categoryName);
  };

  return (
    <div className="product-page page p-4-rem">
      <div className="content-container full flex flex-column">
        <div className="product-top-section">
          <Textfield
            classNamesObj={{ containerClassName: "category-input-container" }}
            placeholder={t("products.category")}
            onChange={handleChange}
            disabled={!productCategoriesQuery.isSuccess}
          />
          <AddCategoryAlert />
        </div>
        <ContentWrapper query={productCategoriesQuery}>
          {({ data }) => (
            <div className="categories-container m-scroll">
              {filterProductCategories(data, categoryFilter).map((category) => (
                <Category key={category.id} category={category} />
              ))}
            </div>
          )}
        </ContentWrapper>
      </div>
    </div>
  );
};

export default Products;

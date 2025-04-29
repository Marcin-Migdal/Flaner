import { Textfield, TextFieldChangeEvent } from "@marcin-migdal/m-component-library";
import { useState } from "react";

import { ProductCategory, useGetProductCategoriesQuery } from "../../../app/services/ProductCategories";
import { selectAuthorization } from "../../../app/slices";
import { ContentWrapper } from "../../../components";
import { useAppSelector } from "../../../hooks";
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
            classNamesObj={{ container: "category-input-container" }}
            placeholder="Category..."
            onChange={handleChange}
            disabled={!productCategoriesQuery.isSuccess}
          />
          <AddCategoryAlert />
        </div>
        <ContentWrapper
          query={productCategoriesQuery}
          placeholdersConfig={{ noData: { message: "Please enter at least 3 characters to filter the categories." } }}
        >
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

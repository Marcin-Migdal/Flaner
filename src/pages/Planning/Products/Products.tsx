import { Textfield, TextFieldChangeEvent } from "@marcin-migdal/m-component-library";
import { useEffect, useState } from "react";

import { ContentWrapper } from "@components/index";
import { useAppSelector } from "@hooks/redux-hooks";
import { ProductCategory, useGetProductCategoriesQuery } from "@services/ProductCategories";
import { selectAuthorization } from "@slices/authorization-slice";
import { AddCategoryAlert } from "./components/AddCategoryAlert/AddCategoryAlert";
import { Category } from "./components/Category/Category";

import "./styles.scss";

const filterProductCategories = (categories: ProductCategory[], categoryName: string): ProductCategory[] => {
  if (categoryName.trim().length > 0) {
    return categories.filter((category) =>
      category.name.toLocaleLowerCase().includes(categoryName.toLocaleLowerCase())
    );
  } else {
    return categories;
  }
};

const Products = () => {
  const { authUser } = useAppSelector(selectAuthorization);

  const productCategoriesQuery = useGetProductCategoriesQuery({ currentUserUid: authUser?.uid });

  const [filteredProductCategories, setFilteredProductCategories] = useState<ProductCategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  useEffect(() => {
    const handleInitData = (categories: ProductCategory[]) => {
      setFilteredProductCategories(filterProductCategories(categories, categoryFilter));
    };

    productCategoriesQuery.isSuccess && handleInitData(productCategoriesQuery.data);
  }, [productCategoriesQuery.isSuccess, productCategoriesQuery.data]);

  const handleChange = (event: TextFieldChangeEvent) => {
    const { value: categoryName } = event.target;

    setCategoryFilter(categoryName);

    if (productCategoriesQuery.isSuccess) {
      setFilteredProductCategories(filterProductCategories(productCategoriesQuery.data, categoryName));
    }
  };

  return (
    <div className="product-page page p-4-rem">
      <div className="content-container full flex flex-column ">
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
          {() => (
            <div className="categories-container m-scroll">
              {filteredProductCategories?.map((category) => (
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

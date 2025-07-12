import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { DropdownMenuOption, Icon, useAlert } from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";

import { ContentWrapper, DeleteAlert, KebabMenu, OnDeleteMutation } from "@components";
import { useAppSelector } from "@hooks";
import { ProductCategory, useDeleteProductCategoryMutation } from "@services/ProductCategories";
import { useGetProductsQuery } from "@services/Products";
import { selectAuthorization } from "@slices";

import { AddProductAlert } from "../AddProductAlert/AddProductAlert";
import { EditCategoryAlert } from "../EditCategoryAlert/EditCategoryAlert";
import { ProductList } from "./components/ProductList/ProductList";

import "./styles.scss";

type CategoryProps = {
  category: ProductCategory;
};

export const Category = ({ category }: CategoryProps) => {
  const { t } = useTranslation();
  const { authUser } = useAppSelector(selectAuthorization);

  const query = useGetProductsQuery({ categoryId: category.id, currentUserUid: authUser?.uid });

  const [deleteProductCategory] = useDeleteProductCategoryMutation();

  const [handleOpenEditCategoryAlert, alertEditCategoryProps] = useAlert();
  const [handleOpenDeleteCategoryAlert, alertDeleteCategoryProps] = useAlert();

  const kebabMenuOptions: DropdownMenuOption[] = [
    {
      label: t("products.editCategory"),
      onClick: () => handleOpenEditCategoryAlert(),
      disabled: !authUser?.uid || !category.editAccess.includes(authUser.uid),
    },
    {
      label: t("products.deleteCategory"),
      onClick: () => handleOpenDeleteCategoryAlert(),
      disabled: category.ownerId !== authUser?.uid,
    },
  ];

  const handleDelete = (): OnDeleteMutation => {
    return deleteProductCategory(category.id);
  };

  return (
    <>
      <div className="category">
        <div className="category-header">
          <Icon style={{ color: category.color }} icon={category.icon as IconProp} />
          <span style={{ color: category.color }} className="category-name">
            {category.name}
          </span>
          <KebabMenu options={kebabMenuOptions} />
        </div>
        <AddProductAlert category={category} />
        <ContentWrapper query={query}>{({ data: products }) => <ProductList products={products} />}</ContentWrapper>
      </div>
      <DeleteAlert {...alertDeleteCategoryProps} onDelete={handleDelete} />
      <EditCategoryAlert category={category} {...alertEditCategoryProps} />
    </>
  );
};

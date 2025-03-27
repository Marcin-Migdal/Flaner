import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { DropdownMenu, DropdownMenuOption, Icon, useAlert } from "@marcin-migdal/m-component-library";

import { ContentWrapper, DeleteAlert } from "@components/index";
import { useAppSelector } from "@hooks/redux-hooks";
import { ProductCategory, useDeleteProductCategoryMutation } from "@services/ProductCategories";
import { useGetProductsQuery } from "@services/Products/product-api";
import { selectAuthorization } from "@slices/authorization-slice";
import { AddProductAlert } from "../AddProductAlert/AddProductAlert";
import { EditCategoryAlert } from "../EditCategoryAlert/EditCategoryAlert";
import { ProductList } from "./components/ProductList/ProductList";

import "./styles.scss";

type CategoryProps = {
  category: ProductCategory;
};

export const Category = ({ category }: CategoryProps) => {
  const { authUser } = useAppSelector(selectAuthorization);

  const query = useGetProductsQuery({ categoryId: category.id, currentUserUid: authUser?.uid });

  const [deleteProductCategory] = useDeleteProductCategoryMutation();

  const [handleOpenEditCategoryAlert, alertEditCategoryProps] = useAlert();
  const [handleOpenDeleteCategoryAlert, alertDeleteCategoryProps] = useAlert();

  const categoryContextMenuOptions: DropdownMenuOption[] = [
    {
      label: "Edit category",
      onClick: () => handleOpenEditCategoryAlert(),
      disabled: !authUser?.uid || !category.editAccess.includes(authUser.uid),
    },
    {
      label: "Delete category",
      onClick: () => handleOpenDeleteCategoryAlert(),
      disabled: category.ownerId !== authUser?.uid,
    },
  ];

  const handleDelete = async () => {
    await deleteProductCategory(category.id);
  };

  return (
    <>
      <div className="category">
        <div className="category-header">
          <Icon style={{ color: category.color }} icon={category.icon as IconProp} />
          <span style={{ color: category.color }} className="category-name">
            {category.name}
          </span>
          <DropdownMenu
            triggerContainerClassName="category-context-menu-trigger"
            options={categoryContextMenuOptions}
            openEvent="click"
            openPosition="auto-bottom"
            centerConsumer
            hideDisabledOptions
            hideOnDisabledOptions
          >
            <Icon icon="ellipsis-vertical" />
          </DropdownMenu>
        </div>
        <AddProductAlert category={category} />
        <ContentWrapper query={query}>{({ data: products }) => <ProductList products={products} />}</ContentWrapper>
      </div>
      <DeleteAlert {...alertDeleteCategoryProps} onDelete={handleDelete} entity="category" />
      <EditCategoryAlert category={category} {...alertEditCategoryProps} />
    </>
  );
};

import { DropdownMenu, DropdownMenuOption, Icon } from "@marcin-migdal/m-component-library";

import { useAppSelector } from "@hooks/redux-hooks";
import { Product } from "@services/Products/product-types";
import { AuthUserConfigType, selectAuthorization } from "@slices/authorization-slice";

import "./styles.scss";

const getProductContextMenuOptions = (
  product: Product,
  authUser: AuthUserConfigType | null,
  openHandlers: {
    deleteAlert: (productId: string) => void;
    editAlert: (product: Product | undefined) => void;
  }
): DropdownMenuOption[] => {
  const { deleteAlert, editAlert } = openHandlers;

  return [
    {
      label: "Edit product",
      onClick: () => editAlert(product),
      disabled: !authUser?.uid || !product.editAccess.includes(authUser.uid),
    },
    {
      label: "Delete product",
      onClick: () => deleteAlert(product.id),
      disabled: product.ownerId !== authUser?.uid,
    },
  ];
};

type ProductProps = {
  product: Product;
  handleOpenDeleteProductAlert: (data: string) => void;
  handleOpenEditProductAlert: (data: Product) => void;
};

export const ProductItem = ({ product, handleOpenDeleteProductAlert, handleOpenEditProductAlert }: ProductProps) => {
  const { authUser } = useAppSelector(selectAuthorization);
  return (
    <li className="products-list-item" key={product.id}>
      <Icon icon="grip" />
      <span>{product.name}</span>
      <DropdownMenu
        triggerContainerClassName="product-context-menu-trigger"
        options={getProductContextMenuOptions(product, authUser, {
          deleteAlert: handleOpenDeleteProductAlert,
          editAlert: handleOpenEditProductAlert,
        })}
        openEvent="click"
        openPosition="auto-bottom"
        centerConsumer
        hideDisabledOptions
        hideOnDisabledOptions
      >
        <Icon icon="ellipsis-vertical" />
      </DropdownMenu>
    </li>
  );
};

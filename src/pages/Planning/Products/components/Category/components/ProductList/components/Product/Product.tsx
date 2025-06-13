import { DropdownMenu, Icon } from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";

import { useAppSelector } from "@hooks";
import { Product } from "@services/Products";
import { selectAuthorization } from "@slices";

import "./styles.scss";

type ProductProps = {
  product: Product;
  handleOpenDeleteProductAlert: (data: string) => void;
  handleOpenEditProductAlert: (data: Product) => void;
};

export const ProductItem = ({ product, handleOpenDeleteProductAlert, handleOpenEditProductAlert }: ProductProps) => {
  const { authUser } = useAppSelector(selectAuthorization);
  const { t } = useTranslation();

  return (
    <li className="products-list-item" key={product.id}>
      <Icon icon="grip" />
      <span>{product.name}</span>
      <DropdownMenu
        triggerContainerClassName="product-context-menu-trigger"
        options={[
          {
            label: t("products.editProduct"),
            onClick: () => handleOpenEditProductAlert(product),
            disabled: !authUser?.uid || !product.editAccess.includes(authUser.uid),
          },
          {
            label: t("products.deleteProduct"),
            onClick: () => handleOpenDeleteProductAlert(product.id),
            disabled: product.ownerId !== authUser?.uid,
          },
        ]}
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

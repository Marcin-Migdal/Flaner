import { useAlert } from "@marcin-migdal/m-component-library";

import { DeleteAlert } from "@components/index";
import { useDeleteProductMutation } from "@services/Products/product-api";
import { Product } from "@services/Products/product-types";
import { EditProductAlert } from "../../../EditProductAlert/EditProductAlert";
import { ProductItem } from "./components/Product/Product";

import "./styles.scss";

type ProductListProps = {
  products: Product[];
};

export const ProductList = ({ products }: ProductListProps) => {
  const [handleOpenDeleteProductAlert, alertDeleteProductProps] = useAlert<string>();
  const [handleOpenEditProductAlert, alertEditProductProps] = useAlert<Product>();

  const [deleteProduct] = useDeleteProductMutation();

  const handleDelete = async () => {
    if (alertDeleteProductProps.data === undefined) {
      return;
    }

    await deleteProduct(alertDeleteProductProps.data);
  };

  return (
    <ul className="products-list m-scroll slim-scroll">
      {products.map((product) => (
        <ProductItem
          product={product}
          key={product.id}
          handleOpenDeleteProductAlert={handleOpenDeleteProductAlert}
          handleOpenEditProductAlert={handleOpenEditProductAlert}
        />
      ))}
      <DeleteAlert {...alertDeleteProductProps} onDelete={handleDelete} entity="product" />
      <EditProductAlert {...alertEditProductProps} />
    </ul>
  );
};

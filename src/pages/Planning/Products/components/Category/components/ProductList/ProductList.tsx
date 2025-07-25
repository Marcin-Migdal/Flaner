import { useAlert } from "@marcin-migdal/m-component-library";

import { DeleteAlert, OnDeleteMutation } from "@components";
import { Product, useDeleteProductMutation } from "@services/Products";

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

  const handleDelete = (): OnDeleteMutation => {
    if (alertDeleteProductProps.data === undefined) {
      return;
    }

    return deleteProduct(alertDeleteProductProps.data);
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
      <DeleteAlert {...alertDeleteProductProps} onDelete={handleDelete} />
      <EditProductAlert {...alertEditProductProps} />
    </ul>
  );
};

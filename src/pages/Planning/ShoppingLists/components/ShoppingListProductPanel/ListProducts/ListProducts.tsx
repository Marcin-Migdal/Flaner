import { Accordion, useAlert } from "@marcin-migdal/m-component-library";

import { DeleteAlert, OnDeleteMutation } from "@components";
import { useAppSelector } from "@hooks";
import { useGetShoppingListQuery } from "@services/ShoppingLists";
import { ShoppingListProduct, useDeleteShoppingListProductMutation } from "@services/ShoppingListsProduct";
import { selectAuthorization } from "@slices";

import { EditShoppingListProductAlert } from "../../EditShoppingListProductAlert/EditShoppingListProductAlert";
import { ListProduct } from "./ListProduct/ListProduct";

type ListProductsProps = {
  products: ShoppingListProduct[];
  selectedShoppingListId: string | null;
};

export const ListProducts = ({ products, selectedShoppingListId }: ListProductsProps) => {
  const { authUser } = useAppSelector(selectAuthorization);

  const [handleOpenDeleteAlert, deleteAlertProps] = useAlert<string>();
  const [handleOpenEditAlert, editAlertProps] = useAlert<ShoppingListProduct>();

  const [deleteListProduct] = useDeleteShoppingListProductMutation();

  const { shoppingList } = useGetShoppingListQuery(
    { currentUserUid: authUser?.uid },
    {
      selectFromResult: ({ data: shoppingLists }) => ({
        shoppingList: shoppingLists?.find(({ id }) => id === selectedShoppingListId),
      }),
    }
  );

  const handleListProductDelete = (): OnDeleteMutation => {
    if (!selectedShoppingListId || !deleteAlertProps.data) {
      return;
    }

    return deleteListProduct({
      shoppingListId: selectedShoppingListId,
      shoppingListsProductId: deleteAlertProps.data,
    });
  };

  return (
    <>
      <Accordion
        expandOnIconClick
        instanceClassName="shopping-list-products-accordion"
        className="m-scroll pr-1-rem"
        expansionMode="multiple"
      >
        {products.map((product) => (
          <ListProduct
            product={product}
            key={product.id}
            shoppingList={shoppingList}
            handleOpenDeleteAlert={handleOpenDeleteAlert}
            handleOpenEditAlert={handleOpenEditAlert}
          />
        ))}
      </Accordion>
      <DeleteAlert onDelete={handleListProductDelete} {...deleteAlertProps} />
      <EditShoppingListProductAlert shoppingListId={selectedShoppingListId} {...editAlertProps} />
    </>
  );
};

import { Accordion, useAlert } from "@marcin-migdal/m-component-library";

import { useGetShoppingListQuery } from "../../../../../../app/services/ShoppingLists";
import { selectAuthorization } from "../../../../../../app/slices";
import { DeleteAlert, NoDataPlaceholder } from "../../../../../../components";
import { OnDeleteMutation } from "../../../../../../components/alerts/DeleteAlert";
import { useAppSelector } from "../../../../../../hooks";
import { EditShoppingListProductAlert } from "../../EditShoppingListProductAlert/EditShoppingListProductAlert";
import { ListProduct } from "./ListProduct/ListProduct";

import {
  ShoppingListProduct,
  useDeleteShoppingListProductMutation,
} from "../../../../../../app/services/ShoppingListsProduct";

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
      {products.length > 0 ? (
        <>
          <Accordion
            // icon="none"
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
          <DeleteAlert entity="Shopping list product" onDelete={handleListProductDelete} {...deleteAlertProps} />
        </>
      ) : (
        <NoDataPlaceholder message="No products in shopping list" />
      )}
      <EditShoppingListProductAlert shoppingListId={selectedShoppingListId} {...editAlertProps} />
    </>
  );
};

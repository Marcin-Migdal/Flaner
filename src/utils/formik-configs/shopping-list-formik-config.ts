import { InferSchemaType } from "@marcin-migdal/m-component-library";
import * as Yup from "yup";

import { schemaName } from "./common-fields";

export type ShoppingListState = {
  name: string;
};

export const initShoppingListValues: ShoppingListState = {
  name: "",
};

export const shoppingListValidationSchema = Yup.object().shape({
  name: schemaName,
});

export type ShoppingListSubmitState = InferSchemaType<typeof shoppingListValidationSchema>;

import { InferSchemaType } from "@marcin-migdal/m-component-library";
import * as Yup from "yup";

import { schemaAmount, schemaOptionalDescription } from "./common-fields";

import {
  ShoppingListProductCategory,
  ShoppingListProductDetails,
  ShoppingListProductUnit,
} from "@services/ShoppingListsProduct";

export type ShoppingListProductState = {
  amount: number | null;
  description: string;

  category: ShoppingListProductCategory | null;
  product: ShoppingListProductDetails | null;
  unit: ShoppingListProductUnit | null;
  // image: string;
};

export const initShoppingListProductValues: ShoppingListProductState = {
  amount: 1,
  description: "",

  category: null,
  product: null,
  unit: null,
  // image: "",
};

export const shoppingListProductValidationSchema = Yup.object().shape({
  amount: schemaAmount,
  description: schemaOptionalDescription,

  category: Yup.object()
    .shape({
      id: Yup.string().nullable().required("validation.required"),
      name: Yup.string().nullable().required("validation.required"),
      icon: Yup.string().nullable().required("validation.required"),
      color: Yup.string().nullable().required("validation.required"),
    })
    .nullable()
    .required("validation.required"),

  product: Yup.object()
    .shape({
      id: Yup.string().nullable().required("validation.required"),
      name: Yup.string().nullable().required("validation.required"),
      categoryId: Yup.string().nullable().required("validation.required"),
    })
    .nullable()
    .required("validation.required"),

  unit: Yup.object()
    .shape({
      id: Yup.string().nullable().required("validation.required"),
      name: Yup.string().nullable().required("validation.required"),
      shortName: Yup.string().nullable().required("validation.required"),
    })
    .nullable()
    .required("validation.required"),

  // image: Yup.string().required("validation.required"),
});

export type ShoppingListProductSubmitState = InferSchemaType<typeof shoppingListProductValidationSchema>;

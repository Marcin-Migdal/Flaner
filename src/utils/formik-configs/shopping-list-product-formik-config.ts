import { InferSchemaType } from "@marcin-migdal/m-component-library";
import * as Yup from "yup";

import { ProductCategory } from "../../app/services/ProductCategories";
import { Product } from "../../app/services/Products";
import { Unit } from "../../app/services/Units";
import { schemaAccessFields, schemaAmount, schemaAuditFields, schemaOptionalDescription } from "./common-fields";

export type ShoppingListProductState = {
  amount: number | null;
  description: string;

  category: ProductCategory | null;
  product: Product | null;
  unit: Unit | null;
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
      id: Yup.string().nullable().required("Required"),
      name: Yup.string().nullable().required("Required"),
      icon: Yup.string().nullable().required("Required"),
      color: Yup.string().nullable().required("Required"),

      ...schemaAuditFields,
      ...schemaAccessFields,
    })
    .nullable()
    .required("Required"),

  product: Yup.object()
    .shape({
      id: Yup.string().nullable().required("Required"),
      name: Yup.string().nullable().required("Required"),
      categoryId: Yup.string().nullable().required("Required"),

      ...schemaAuditFields,
      ...schemaAccessFields,
    })
    .nullable()
    .required("Required"),

  unit: Yup.object()
    .shape({
      id: Yup.string().nullable().required("Required"),
      name: Yup.string().nullable().required("Required"),
      shortName: Yup.string().nullable().required("Required"),
    })
    .nullable()
    .required("Required"),

  // image: Yup.string().required("Required"),
});

export type ShoppingListProductSubmitState = InferSchemaType<typeof shoppingListProductValidationSchema>;

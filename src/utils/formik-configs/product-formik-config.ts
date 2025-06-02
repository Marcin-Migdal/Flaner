import { InferSchemaType } from "@marcin-migdal/m-component-library";
import * as Yup from "yup";

import { ProductCategory } from "@services/ProductCategories";

import { schemaAccessFields, schemaAuditFields, schemaName } from "./common-fields";

export type ProductState = {
  name: string;
  category: ProductCategory | null;
  // image: string;
};

export const initProductValues: ProductState = {
  name: "",
  category: null,
  // image: "",
};

export const productValidationSchema = Yup.object().shape({
  name: schemaName,
  category: Yup.object()
    .shape({
      id: Yup.string().nullable().required("validation.required"),
      name: Yup.string().nullable().required("validation.required"),
      icon: Yup.string().nullable().required("validation.required"),
      color: Yup.string().nullable().required("validation.required"),
      ...schemaAuditFields,
      ...schemaAccessFields,
    })
    .nullable()
    .required("validation.required"),
  // image: Yup.string().required("validation.required"),
});

export type ProductSubmitState = InferSchemaType<typeof productValidationSchema>;

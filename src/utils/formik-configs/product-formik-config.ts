import { InferSchemaType } from "@marcin-migdal/m-component-library";
import * as Yup from "yup";

import { ProductCategory } from "../../app/services/ProductCategories";
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
      id: Yup.string().nullable().required("Required"),
      name: Yup.string().nullable().required("Required"),
      icon: Yup.string().nullable().required("Required"),
      color: Yup.string().nullable().required("Required"),

      ...schemaAuditFields,
      ...schemaAccessFields,
    })
    .nullable()
    .required("Required"),
  // image: Yup.string().required("Required"),
});

export type ProductSubmitState = InferSchemaType<typeof productValidationSchema>;

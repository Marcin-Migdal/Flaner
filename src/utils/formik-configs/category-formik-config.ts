import { ColorValue, InferSchemaType } from "@marcin-migdal/m-component-library";
import * as Yup from "yup";
import { schemaName } from "./common-fields";

export type CategoryState = {
  name: string;
  icon: string | null;
  color: ColorValue;
};

export const initCategoryValues: CategoryState = {
  name: "",
  icon: "",
  color: "#ffffff",
};

export const categoryValidationSchema = Yup.object().shape({
  name: schemaName,
  icon: Yup.string().nullable().required("Required"),
  color: Yup.string().required("Required"),
});

export type CategorySubmitState = InferSchemaType<typeof categoryValidationSchema>;

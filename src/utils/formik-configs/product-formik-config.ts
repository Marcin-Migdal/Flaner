import { DropdownStringOption } from "@marcin-migdal/m-component-library/build/components/Inputs/Dropdown/types";
import * as Yup from "yup";

export type ProductState = {
  name: string;
  category: DropdownStringOption | undefined;
  // image: string;
};

export const initProductValues: ProductState = {
  name: "",
  category: undefined,
  // image: "",
};

export const productValidationSchema = Yup.object().shape({
  name: Yup.string().required("Required").min(3, "Name is too short").max(20, "Name is too long"),
  category: Yup.object()
    .shape({
      label: Yup.string().required("Required"),
      value: Yup.string().required("Required"),
    })
    .nullable()
    .required("Required"),
  // image: Yup.string().required("Required"),
});

import * as Yup from "yup";

export type CategoryState = {
  name: string;
  color: string;
  icon: string;
};

export const categoryValues: CategoryState = {
  name: "",
  color: "",
  icon: "",
};

export const categoryValidationSchema = Yup.object().shape({
  name: Yup.string().required("Required").min(3, "Name is too short").max(20, "Name is too long"),
  color: Yup.string().required("Required"),
  icon: Yup.string().required("Required"),
});

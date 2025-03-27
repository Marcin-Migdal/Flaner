import * as Yup from "yup";

export type SignInState = {
  email: string;
  password: string;
};

export const signInInitialValues: SignInState = {
  email: "",
  password: "",
};

export const signInValidationSchema = Yup.object().shape({
  email: Yup.string().required("Required"),
  password: Yup.string().required("Required"),
});

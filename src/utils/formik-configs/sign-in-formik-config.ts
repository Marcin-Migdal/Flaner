import { InferSchemaType } from "@marcin-migdal/m-component-library";
import * as Yup from "yup";

import { schemaEmail } from "./common-fields";

export type SignInState = {
  email: string;
  password: string;
};

export const signInInitialValues: SignInState = {
  email: "",
  password: "",
};

export const signInValidationSchema = Yup.object().shape({
  email: schemaEmail,
  password: Yup.string().max(30, "validation.password.maxLength").required("validation.required"),
});

export type SignInSubmitState = InferSchemaType<typeof signInValidationSchema>;

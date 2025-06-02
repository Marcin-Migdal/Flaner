import { InferSchemaType } from "@marcin-migdal/m-component-library";
import * as Yup from "yup";

import { schemaEmail } from "./common-fields";

export type SignUpState = {
  email: string;
  username: string;
  password: string;
  verifyPassword: string;
};

export const signUpInitialValues: SignUpState = {
  email: "",
  username: "",
  password: "",
  verifyPassword: "",
};

export const signUpValidationSchema = Yup.object().shape({
  username: Yup.string()
    .matches(/^[a-zA-Z0-9_.]+$/, "validation.username.format")
    .min(3, "validation.username.minLength")
    .max(30, "validation.username.maxLength")
    .required("validation.required"),
  email: schemaEmail,
  password: Yup.string()
    .min(8, "validation.password.minLength")
    .max(30, "validation.password.maxLength")
    .matches(/[A-Z]/, "validation.password.uppercase")
    .matches(/[a-z]/, "validation.password.lowercase")
    .matches(/[0-9]/, "validation.password.number")
    .matches(/[@$!%*?&]/, "validation.password.special")
    .required("validation.required"),
  verifyPassword: Yup.string()
    .test("passwords-match", "validation.password.match", function (value) {
      return this.parent.password === value;
    })
    .required("validation.required"),
});

export type SignUpSubmitState = InferSchemaType<typeof signUpValidationSchema>;

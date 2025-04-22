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
  email: schemaEmail,

  username: Yup.string()
    .matches(/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, underscores, and periods.")
    .min(3, "Username must be at least 3 characters.")
    .max(30, "Username cannot be longer than 20 characters.")
    .required("Required"),

  password: Yup.string()
    .min(8, "Password must be at least 8 characters.")
    .max(30, "Password cannot be longer than 30 characters.")
    .matches(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .matches(/[a-z]/, "Password must contain at least one lowercase letter.")
    .matches(/[0-9]/, "Password must contain at least one number.")
    .matches(/[@$!%*?&]/, "Password must contain at least one special character.")
    .required("Required"),

  verifyPassword: Yup.string()
    .required("Required")
    .test("passwords-match", "Passwords must match", function (value) {
      return this.parent.password === value;
    }),
});

export type SignUpSubmitState = InferSchemaType<typeof signUpValidationSchema>;

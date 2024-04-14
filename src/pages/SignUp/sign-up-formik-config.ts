import * as Yup from "yup";

export interface ISignUpState {
    email: string;
    username: string;
    password: string;
    verifyPassword: string;
}

export const signUpInitialValues: ISignUpState = {
    email: "",
    username: "",
    password: "",
    verifyPassword: "",
};

export const signUpValidationSchema = Yup.object().shape({
    email: Yup.string().email("Invalid email address").required("Required"),
    username: Yup.string()
        .required("Required")
        .matches(/^S*/, "no spaces")
        .min(3, "Must be at least 3 characters")
        .max(20, "Max length of the password is 20 characters"),
    password: Yup.string()
        .required("Required")
        .min(8, "Must be at least 8 characters long")
        .max(20, "Max length of the password is 20 characters"),
    verifyPassword: Yup.string()
        .required("Required")
        .test("passwords-match", "Passwords must match", function (value) {
            return this.parent.password === value;
        }),
});

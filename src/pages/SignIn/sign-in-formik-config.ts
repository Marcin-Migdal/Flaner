import * as Yup from "yup";

export interface ISignInState {
    email: string;
    password: string;
}

export const signInInitialValues: ISignInState = {
    email: "",
    password: "",
};

export const signInValidationSchema = Yup.object().shape({
    email: Yup.string().required("Required"),
    password: Yup.string().required("Required"),
});

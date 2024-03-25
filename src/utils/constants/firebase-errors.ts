type IErrorObj = {
    [key in ErrorCodeTypes]: IError | undefined;
};

type ErrorCodeTypes =
    | "auth/invalid-login-credentials"
    | "auth/user-not-found"
    | "auth/wrong-password"
    | "auth/username-already-in-use"
    | "auth/email-already-in-use"
    | "auth/invalid-email"
    | "auth/too-many-requests"
    | "unknown_error-occurred";

export interface IError {
    message: string;
    code: string;
    fieldNames?: string | string[];
}

export const authErrors: IErrorObj = {
    "auth/invalid-login-credentials": {
        message: "Invalid credentials",
        code: "auth/invalid-login-credentials",
        fieldNames: ["email", "password"],
    },
    "auth/user-not-found": {
        message: "Email not found",
        code: "auth/user-not-found",
        fieldNames: "email",
    },
    "auth/wrong-password": {
        message: "Wrong password",
        code: "auth/wrong-password",
        fieldNames: "password",
    },
    "auth/username-already-in-use": {
        message: "Username already in use",
        code: "auth/username-already-in-use",
        fieldNames: "userName",
    },
    "auth/email-already-in-use": {
        message: "Email already in use",
        code: "auth/email-already-in-use",
        fieldNames: "email",
    },
    "auth/invalid-email": {
        message: "Invalid email",
        code: "auth/invalid-email",
        fieldNames: "email",
    },
    "auth/too-many-requests": {
        message: "Access to this account has been temporarily disabled due to many failed login attempts. You can try again later.",
        code: "auth/too-many-requests",
    },
    "unknown_error-occurred": {
        message: "Error has occurred, please try again",
        code: "unknown_error-occurred",
    },
};

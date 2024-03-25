import { FormErrorsType } from "@Marcin-Migdal/morti-component-library";

import { IFirebaseError, TranslateFunctionType } from "@slices/authorization-slice";
import { IError, authErrors } from "../constants/firebase-errors";

export const getRejectValue = <T = undefined>(
    code: string | undefined = "unknown_error-occurred",
    t: TranslateFunctionType
): IFirebaseError<T> => {
    let authError: IError = Object.keys(authErrors).some((authError) => authError === code)
        ? { ...authErrors[code] }
        : { ...authErrors["unknown_error-occurred"] };
    authError.message = t(authError.message);

    return {
        code: authError.code,
        message: authError.message,
        formErrors: getFormFieldsErrors(authError),
    };
};

const getFormFieldsErrors = (authError: IError): FormErrorsType<any> => {
    const { fieldNames, message } = authError;

    if (!fieldNames) return {};
    return Array.isArray(fieldNames) ? fieldNames.reduce((obj, key) => ({ ...obj, [key]: message }), {}) : { [fieldNames]: message };
};

export const toSerializable = <T>(data): T => JSON.parse(JSON.stringify(data));

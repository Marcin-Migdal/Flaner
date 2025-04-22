import { FormErrors } from "@marcin-migdal/m-component-library";

import { FirebaseError } from "@slices/authorization-slice";
import { IError, authErrors } from "../constants/firebase-errors";

const getFormFieldsErrors = (authError: IError): FormErrors<unknown> => {
  const { fieldNames, message } = authError;

  if (!fieldNames) {
    return {};
  }
  return Array.isArray(fieldNames)
    ? fieldNames.reduce((obj, key) => ({ ...obj, [key]: message }), {})
    : { [fieldNames]: message };
};

export const getRejectValue = <T = undefined>(
  receivedCode: string | undefined = "unknown_error-occurred"
): FirebaseError<T> => {
  const authError: IError = Object.keys(authErrors).some((authErrorCode) => authErrorCode === receivedCode)
    ? { ...authErrors[receivedCode] }
    : { ...authErrors["unknown_error-occurred"] };

  return {
    code: authError.code,
    message: authError.message,
    formErrors: getFormFieldsErrors(authError),
  };
};

export const toSerializable = <T>(data): T => JSON.parse(JSON.stringify(data));

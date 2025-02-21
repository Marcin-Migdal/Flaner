import { FormErrorsType } from "@marcin-migdal/m-component-library";

import { IFirebaseError } from "@slices/authorization-slice";
import { IError, authErrors } from "../constants/firebase-errors";

export const getRejectValue = <T = undefined>(
  code: string | undefined = "unknown_error-occurred"
): IFirebaseError<T> => {
  const authError: IError = Object.keys(authErrors).some((authError) => authError === code)
    ? { ...authErrors[code] }
    : { ...authErrors["unknown_error-occurred"] };

  return {
    code: authError.code,
    message: authError.message,
    formErrors: getFormFieldsErrors(authError),
  };
};

const getFormFieldsErrors = (authError: IError): FormErrorsType<any> => {
  const { fieldNames, message } = authError;

  if (!fieldNames) return {};
  return Array.isArray(fieldNames)
    ? fieldNames.reduce((obj, key) => ({ ...obj, [key]: message }), {})
    : { [fieldNames]: message };
};

export const toSerializable = <T>(data): T => JSON.parse(JSON.stringify(data));

import { FormErrors } from "@marcin-migdal/m-component-library";

import { FirebaseApiError } from "@services/Authorization";
import { ErrorObjKeys, errorsObj, IError } from "../constants/firebase-errors";

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
  errorKey: string | undefined = ErrorObjKeys.UNKNOWN_ERROR_OCCURRED
): FirebaseApiError<T> => {
  const authError: IError = errorsObj[errorKey] || errorsObj[ErrorObjKeys.UNKNOWN_ERROR_OCCURRED];

  return {
    message: authError.message,
    formErrors: getFormFieldsErrors(authError),
  };
};

export const toSerializable = <T>(data: unknown): T => JSON.parse(JSON.stringify(data));

import { FormErrors } from "@marcin-migdal/m-component-library";

import {
  ENTITY_TEXT_INJECTION_POINTER,
  FlanerApiErrorContent,
  flanerApiErrorsContent,
  FlanerApiErrorsContentKeys,
} from "@utils/constants";
import { FlanerApiError } from "@utils/error-classes";

export const getFlanerAuthError = (error, fallbackError: FlanerApiError): FlanerApiError => {
  if (Object.values(FlanerApiErrorsContentKeys).includes(error?.code)) {
    return new FlanerApiError(error.code);
  }

  return fallbackError;
};

type GetRtkErrorResult = { error: FlanerApiError };

export const getRtkError = (error: unknown, fallbackError: FlanerApiError): GetRtkErrorResult => {
  if (error instanceof FlanerApiError) {
    return { error };
  }

  return { error: fallbackError };
};

const getFormFieldsErrors = (fieldNames: string[] | undefined, message: string): FormErrors<unknown> => {
  if (!fieldNames) {
    return {};
  }

  return fieldNames.reduce((obj, key) => ({ ...obj, [key]: message }), {});
};

export type ConstructedFlanerApiErrorContent<T = unknown> = {
  message: string;
  formErrors: FormErrors<T>;
};

export const constructFlanerApiErrorContent = (errorValues: FlanerApiError): ConstructedFlanerApiErrorContent => {
  const errorContent: FlanerApiErrorContent = flanerApiErrorsContent[errorValues.code];

  let message = errorContent.message;

  if (errorContent.message.includes(ENTITY_TEXT_INJECTION_POINTER)) {
    const entity =
      errorValues.entity || (errorContent.message.startsWith(ENTITY_TEXT_INJECTION_POINTER) ? "Data" : "data");

    message = errorContent.message.replace(ENTITY_TEXT_INJECTION_POINTER, entity);
  }

  return {
    message: message,
    formErrors: getFormFieldsErrors(errorContent.fieldNames, message),
  };
};

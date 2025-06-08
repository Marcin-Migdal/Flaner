import { FormErrors } from "@marcin-migdal/m-component-library";

import { ENTITY_TEXT_INJECTION_POINTER, FlanerApiErrorContent, flanerApiErrorsContent } from "@utils/constants";
import { FlanerApiError, FlanerApiErrorData } from "@utils/error-classes";

export const getFlanerAuthError = (error, fallbackError: FlanerApiErrorData): FlanerApiErrorData => {
  if (error instanceof FlanerApiError || ("code" in error && typeof error.code === "string")) {
    return { code: error.code };
  }

  return { code: fallbackError.code };
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

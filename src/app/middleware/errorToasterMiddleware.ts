import { isRejectedWithValue, Middleware } from "@reduxjs/toolkit";

import { ConstructedFlanerApiErrorContent, constructFlanerApiErrorContent } from "@services/helpers";
import { addToast } from "@slices/toast-slice";
import { flanerApiErrorsContent, FlanerApiErrorsContentKeys } from "@utils/constants";
import { FlanerApiError } from "@utils/error-classes";

export const errorIntersectMiddleware: Middleware = (api) => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const payload = action.payload;

    let error: ConstructedFlanerApiErrorContent<unknown> = {
      message: flanerApiErrorsContent[FlanerApiErrorsContentKeys.UNKNOWN_ERROR_OCCURRED].message,
      formErrors: {},
    };

    if (typeof payload === "object" && payload !== null) {
      if (payload instanceof FlanerApiError) {
        error = constructFlanerApiErrorContent(payload);
      } else if ("message" in payload && typeof payload.message === "string") {
        error.message = payload.message;
      }
    }

    api.dispatch(addToast({ type: "failure", message: error.message }));

    return next({ ...action, payload: error });
  }

  return next(action);
};

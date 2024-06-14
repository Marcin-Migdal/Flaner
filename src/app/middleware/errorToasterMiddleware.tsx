import { Middleware, isRejectedWithValue } from "@reduxjs/toolkit";
import { addToast } from "@slices/toast-slice";

export const errorIntersectMiddleware: Middleware = (api) => (next) => (action) => {
    if (isRejectedWithValue(action)) {
        const payload = action.payload;

        api.dispatch(
            addToast({
                type: "failure",
                message: typeof payload === "string" ? payload : "Error has occurred",
            })
        );
    }

    return next(action);
};

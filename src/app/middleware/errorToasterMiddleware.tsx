import { Middleware, isRejectedWithValue } from "@reduxjs/toolkit";
import { addToast } from "@slices/toast-slice";

export const errorIntersectMiddleware: Middleware = (api) => (next) => (action) => {
    if (isRejectedWithValue(action)) {
        const payload = action.payload;

        console.log(payload);
        api.dispatch(
            addToast({
                type: "failure",
                message: typeof payload === "string" ? payload : (payload as Error)?.message || "Error has occurred",
            })
        );
    }

    return next(action);
};

import { Middleware, isRejectedWithValue } from "@reduxjs/toolkit";

export const errorIntersectMiddleware: Middleware = () => (next) => (action) => {
    if (isRejectedWithValue(action)) {
        console.log(action);
        const meta = action.meta;
        const payload = action.payload;

        // TODO! implement logic for displaying toasts
    }

    return next(action);
};

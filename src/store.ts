import { configureStore } from "@reduxjs/toolkit";

import { authorizationReducer, toastReducer } from "@slices/index";

const store = configureStore({
    reducer: {
        authorization: authorizationReducer,
        toast: toastReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these action types
                ignoredActions: ["toast/setToastHandler"],
                // Ignore these paths in the state
                ignoredPaths: ["toast.toastHandler"],
            },
        }),
});

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

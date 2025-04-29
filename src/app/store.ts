import { configureStore } from "@reduxjs/toolkit";

import { errorIntersectMiddleware } from "./middleware/errorToasterMiddleware";
import { firestoreApi } from "./services/api";
import { authorizationReducer, toastReducer } from "./slices";

const store = configureStore({
  reducer: {
    authorization: authorizationReducer,
    toast: toastReducer,
    [firestoreApi.reducerPath]: firestoreApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ["toast/setToastHandler"],
        // Ignore these paths in the state
        ignoredPaths: ["toast.toastHandler"],
      },
    }).concat(firestoreApi.middleware, errorIntersectMiddleware),
});

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

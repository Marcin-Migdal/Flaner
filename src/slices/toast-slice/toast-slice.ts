import { ToastHandler, VariantTypes } from "@Marcin-Migdal/morti-component-library";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

import { ISignInState } from "@pages/SignIn/sign-in-formik-config";
import { ISignUpState } from "@pages/SignUp/sign-up-formik-config";
import { IFirebaseError } from "@slices/authorization-slice";

interface IToastInitialState {
    toastHandler: ToastHandler | null;
}

const initialState: IToastInitialState = {
    toastHandler: null,
};

const toastSlice = createSlice({
    name: "toast",
    initialState: initialState,
    reducers: {
        setToastHandler: (state, action: PayloadAction<ToastHandler | null>) => {
            state.toastHandler = action.payload;
        },
        addToast: (state, action: PayloadAction<{ type: VariantTypes; message: string }>) => {
            const { type, message } = action.payload;
            state.toastHandler?.addToast({ type, message });
        },
        clearToasts: (state) => {
            state.toastHandler?.clear();
        },
    },
    extraReducers: (builder) => {
        //* Match only error actions from authorization slice
        builder.addMatcher(
            (action) => action.type.startsWith("authorization/") && action.type.endsWith("/rejected"),
            (state, action: PayloadAction<IFirebaseError<ISignInState | ISignUpState>>) => {
                state.toastHandler?.addToast({ type: "failure", message: action.payload.message });
            }
        );
    },
});

// Action creators are generated for each function in reducers object
export const { setToastHandler, addToast, clearToasts } = toastSlice.actions;

export default toastSlice.reducer;

import { AddToastPayload, ToastHandler, ToastVariant } from "@marcin-migdal/m-component-library";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

type ToastInitialState = {
  toastHandler: ToastHandler | null;
};

const initialState: ToastInitialState = {
  toastHandler: null,
};

const toastSlice = createSlice({
  name: "toast",
  initialState: initialState,
  reducers: {
    setToastHandler: (state, action: PayloadAction<ToastHandler | null>) => {
      state.toastHandler = action.payload;
    },
    addToast: (state, action: PayloadAction<AddToastPayload<ToastVariant>>) => {
      state.toastHandler?.addToast(action.payload);
    },
    clearToasts: (state) => {
      state.toastHandler?.clear();
    },
  },
});

export const { setToastHandler, addToast, clearToasts } = toastSlice.actions;

export default toastSlice.reducer;

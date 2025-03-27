import { ToastHandler, ToastVariant } from "@marcin-migdal/m-component-library";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

type ToastInitialState = {
  toastHandler: ToastHandler | null;
};

type AddToastPayload = {
  type: ToastVariant;
  message: string;
  transformContent?: (content: string) => string;
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
    addToast: (state, action: PayloadAction<AddToastPayload>) => {
      state.toastHandler?.addToast(action.payload);
    },
    clearToasts: (state) => {
      state.toastHandler?.clear();
    },
  },
});

// Action creators are generated for each function in reducers object
export const { setToastHandler, addToast, clearToasts } = toastSlice.actions;

export default toastSlice.reducer;

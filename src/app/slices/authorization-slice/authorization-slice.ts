import { FormErrors } from "@marcin-migdal/m-component-library";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

import { SignInState, SignUpState } from "@utils/formik-configs";
import { ConstructedFlanerApiErrorContent } from "src/app/middleware/errorToasterMiddleware";
import { AuthUser, AuthorizationInitialState } from "./authorization-slice-types";

const initialState: AuthorizationInitialState = {
  authUser: null,
  isLoading: true,
  authFormErrors: {},
};

const authorizationSlice = createSlice({
  name: "authorization",
  initialState: initialState,
  reducers: {
    setAuthUser: (state, action: PayloadAction<AuthUser | null>) => {
      state.authUser = action.payload;
      state.isLoading = false;
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setAuthError: (state, action: PayloadAction<FormErrors<SignInState | SignUpState>>) => {
      state.authFormErrors = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      (action) => action.type.startsWith("authorization/") && action.type.endsWith("/pending"),
      (state) => {
        state.isLoading = true;
      }
    );
    builder.addMatcher(
      (action) => action.type.startsWith("authorization/") && action.type.endsWith("/rejected"),
      (state, action: PayloadAction<ConstructedFlanerApiErrorContent<SignInState | SignUpState>>) => {
        state.isLoading = false;
        state.authFormErrors = action.payload.formErrors;
      }
    );
  },
});

export const { setAuthUser, setIsLoading, setAuthError } = authorizationSlice.actions;

export const selectAuthorization = (store: { authorization: AuthorizationInitialState }) => store.authorization;

export default authorizationSlice.reducer;

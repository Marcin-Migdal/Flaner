import { FormErrors } from "@marcin-migdal/m-component-library";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

import { SignInState, SignUpState } from "../../../utils/formik-configs";
import { AuthUserConfigType, AuthUserInitialState, FirebaseError } from "./authorization-interfaces";

const initialState: AuthUserInitialState = {
  authUser: null,
  isLoading: true,
  authFormErrors: {},
};

const authorizationSlice = createSlice({
  name: "authorization",
  initialState: initialState,
  reducers: {
    setAuthUser: (state, action: PayloadAction<AuthUserConfigType | null>) => {
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
  //! There is no fulfilled addMatcher, fulfilled logic is handled in onAuthStateChanged
  extraReducers: (builder) => {
    builder.addMatcher(
      (action) => action.type.startsWith("authorization/") && action.type.endsWith("/pending"),
      (state) => {
        state.isLoading = true;
      }
    );
    builder.addMatcher(
      (action) => action.type.startsWith("authorization/") && action.type.endsWith("/rejected"),
      (state, action: PayloadAction<FirebaseError>) => {
        action.payload?.formErrors && (state.authFormErrors = action.payload.formErrors); // setting errors in form inputs
        state.isLoading = false;
      }
    );
  },
});

// Action creators are generated for each function in reducers object
export const { setAuthUser, setIsLoading, setAuthError } = authorizationSlice.actions;

export const selectAuthorization = (store: { authorization: AuthUserInitialState }) => store.authorization;

export default authorizationSlice.reducer;

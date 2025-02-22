import { Card, Col, Form, FormErrorsType, Icon, Row } from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { CustomButton, CustomTextfield, Page } from "@components/index";
import { useAppDispatch, useAppSelector } from "@hooks/redux-hooks";
import {
  selectAuthorization,
  setAuthError,
  signInWithEmail,
  signInWithGoogle,
  signOut,
} from "@slices/authorization-slice";
import { addToast } from "@slices/toast-slice";
import { PATH_CONSTRANTS } from "@utils/enums";
import { LanguageType } from "i18n";
import { ISignInState, signInInitialValues, signInValidationSchema } from "./sign-in-formik-config";

import "../../commonAssets/css/auth-form.scss";

const nameSpace = "auth";
const SignIn = () => {
  const { t, i18n } = useTranslation(nameSpace);
  const navigate = useNavigate();

  const { isLoading, authFormErrors: authErrors } = useAppSelector(selectAuthorization);
  const dispatch = useAppDispatch();

  const handleSubmit = async (values: ISignInState) => {
    dispatch(signInWithEmail({ ...values }))
      .unwrap()
      .then((user) => {
        if (!user.emailVerified) {
          dispatch(addToast({ type: "information", message: "To sign in, verify your email address" }));
          dispatch(signOut());
          navigate(PATH_CONSTRANTS.SIGN_IN);
        }
      });
  };

  const onGoogleSignIn = async () => dispatch(signInWithGoogle({ language: i18n.language as LanguageType }));

  const handleAuthErrorChange = (authError: FormErrorsType<ISignInState>) => dispatch(setAuthError(authError));

  const handleNavigate = (to: PATH_CONSTRANTS) => {
    dispatch(setAuthError({}));
    navigate(to);
  };

  return (
    <Page className="auth-from-container" flex center>
      <Card className="auth-card">
        <Row>
          <Col sm={12} mdFlex={1} className="left-col">
            <h2>{t("_Hello")}!</h2>
            <p data-cy="sign-in-description">{t("Please sign in to continue")}</p>
            <Form<ISignInState>
              initialValues={signInInitialValues}
              onSubmit={handleSubmit}
              validationSchema={signInValidationSchema}
              externalErrors={authErrors}
              onExternalErrorChange={handleAuthErrorChange}
            >
              {({ values, errors, handleChange, handleBlur, isValid }) => (
                <>
                  <CustomTextfield
                    data-cy="email-input"
                    nameSpace={nameSpace}
                    label="Email"
                    name="email"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    value={values.email}
                    error={errors.email}
                    labelType="floating"
                  />
                  <CustomTextfield
                    data-cy="password-input"
                    nameSpace={nameSpace}
                    label="Password"
                    name="password"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    value={values.password}
                    error={errors.password}
                    labelType="floating"
                    type="password"
                  />
                  <CustomButton
                    data-cy="sign-in-submit-btn"
                    nameSpace={nameSpace}
                    text="Sign in"
                    type="submit"
                    variant="full"
                    disabled={!isValid}
                    busy={isLoading}
                  />
                </>
              )}
            </Form>
            <div className="bottom-section">
              <span>
                {t("_or")} <br /> {t("Sign up with")}
              </span>
              <Icon className="google-sign-in-icon" icon={["fab", "google"]} onClick={onGoogleSignIn} />
            </div>
          </Col>
          <Col sm={12} mdFlex={1} className="right-col">
            <Icon icon={["fas", "rectangle-list"]} />
            <h2>{process.env.APP_NAME}</h2>
            <p>{t("Don't have any account?")}</p>
            <CustomButton
              data-cy="go-to-sign-up-btn"
              nameSpace={nameSpace}
              text="Sign up"
              variant="full"
              onClick={() => handleNavigate(PATH_CONSTRANTS.SIGN_UP)}
            />
          </Col>
        </Row>
      </Card>
    </Page>
  );
};

export default SignIn;

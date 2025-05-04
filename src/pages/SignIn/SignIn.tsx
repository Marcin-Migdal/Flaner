import { ButtonWidth, Card, Col, Form, FormErrors, Icon, Row, useForm } from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { CustomButton, CustomTextfield } from "@components";
import { useAppDispatch, useAppSelector } from "@hooks";
import { LanguageType } from "@i18n";
import { SerializedAuthUser, signInWithEmail, signInWithGoogle, signOut } from "@services/Authorization";
import { addToast, selectAuthorization, setAuthError } from "@slices";
import { PATH_CONSTRANTS } from "@utils/enums";
import { signInInitialValues, SignInState, SignInSubmitState, signInValidationSchema } from "@utils/formik-configs";

import "@commonAssets/css/auth-form.scss";

const SignIn = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const { isLoading, authFormErrors: authErrors } = useAppSelector(selectAuthorization);
  const dispatch = useAppDispatch();

  const handleSubmit = async (values: SignInSubmitState) => {
    const res = await dispatch(signInWithEmail({ ...values }));

    if (res.meta.requestStatus === "fulfilled" && !(res.payload as SerializedAuthUser).emailVerified) {
      dispatch(addToast({ type: "information", message: "To sign in, verify your email address" }));
      dispatch(signOut());
      navigate(PATH_CONSTRANTS.SIGN_IN);
    }
  };

  const handleAuthErrorChange = (authError: FormErrors<SignInState>) => dispatch(setAuthError(authError));

  const formik = useForm<SignInState>({
    initialValues: signInInitialValues,
    onSubmit: handleSubmit,
    validationSchema: signInValidationSchema,
    additionalErrors: authErrors,
    onAdditionalErrors: handleAuthErrorChange,
  });

  const onGoogleSignIn = async () => dispatch(signInWithGoogle({ language: i18n.language as LanguageType }));

  const handleNavigate = (to: PATH_CONSTRANTS) => {
    dispatch(setAuthError({}));
    navigate(to);
  };

  return (
    <div data-testid="sign-in-content" className="page auth-from-container">
      <Card className="auth-card">
        <Row>
          <Col sm={12} mdFlex={1} className="left-col">
            <h2>{t("Hello")}!</h2>
            <p>{t("Please sign in to continue")}</p>
            <Form formik={formik}>
              {({ registerChange, isValid }) => (
                <>
                  <CustomTextfield
                    data-testid="email-input"
                    label="Email"
                    labelType="floating"
                    {...registerChange("email")}
                  />
                  <CustomTextfield
                    data-testid="password-input"
                    label="Password"
                    labelType="floating"
                    type="password"
                    {...registerChange("password")}
                  />
                  <CustomButton
                    text="Sign in"
                    type="submit"
                    variant="full"
                    disabled={!isValid}
                    busy={isLoading}
                    width={ButtonWidth.STRETCH}
                    disableDefaultMargin
                  />
                </>
              )}
            </Form>
            <div className="bottom-section">
              <span>
                {t("or")} <br /> {t("Sign up with")}
              </span>
              <Icon className="google-sign-in-icon" icon={["fab", "google"]} onClick={onGoogleSignIn} />
            </div>
          </Col>
          <Col sm={12} mdFlex={1} className="right-col">
            <Icon icon={["fas", "rectangle-list"]} />
            <h2>{import.meta.env.VITE_APP_NAME}</h2>
            <p>{t("Don't have any account?")}</p>
            <CustomButton
              text="Sign up"
              variant="full"
              onClick={() => handleNavigate(PATH_CONSTRANTS.SIGN_UP)}
              disableDefaultMargin
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default SignIn;

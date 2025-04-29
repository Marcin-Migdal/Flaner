import { ButtonWidth, Card, Col, Form, FormErrors, Icon, Row, useForm } from "@marcin-migdal/m-component-library";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { CustomButton, CustomTextfield } from "../../components";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { LanguageType } from "../../i18n";
import { PATH_CONSTRANTS } from "../../utils/enums";

import {
  signUpInitialValues,
  SignUpState,
  SignUpSubmitState,
  signUpValidationSchema,
} from "../../utils/formik-configs";

import {
  addToast,
  selectAuthorization,
  setAuthError,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
} from "../../app/slices";

import "../../commonAssets/css/auth-form.scss";

const SignUp = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const dispatch = useAppDispatch();
  const { isLoading, authFormErrors: authErrors } = useAppSelector(selectAuthorization);

  const handleSubmit = async (values: SignUpSubmitState) => {
    dispatch(signUpWithEmail({ ...values, language: i18n.language as LanguageType }))
      .unwrap()
      .then((user) => {
        if (!user.emailVerified) {
          dispatch(addToast({ type: "information", message: "To sign in, verify your email address" }));
          dispatch(signOut());
          navigate(PATH_CONSTRANTS.SIGN_IN);
        }
      });
  };

  const handleAuthErrorChange = (newAuthErrors: FormErrors<SignUpState>) => dispatch(setAuthError(newAuthErrors));

  const formik = useForm<SignUpState>({
    initialValues: signUpInitialValues,
    validationSchema: signUpValidationSchema,
    onSubmit: handleSubmit,
    additionalErrors: authErrors,
    onAdditionalErrors: handleAuthErrorChange,
  });

  const onGoogleSignIn = async () => dispatch(signInWithGoogle({ language: i18n.language as LanguageType }));

  const handleNavigate = (to: PATH_CONSTRANTS) => {
    dispatch(setAuthError({}));
    navigate(to);
  };

  return (
    <div className="page auth-from-container">
      <Card className="auth-card">
        <Row>
          <Col sm={12} mdFlex={1} className="left-col">
            <h2>{t("Hello")}!</h2>
            <p data-cy="sign-up-description">{t("Please sign up to continue")}</p>
            <Form formik={formik}>
              {({ registerChange, isValid }) => (
                <>
                  <CustomTextfield
                    data-cy="username-input"
                    label="Username"
                    labelType="floating"
                    {...registerChange("username")}
                  />
                  <CustomTextfield
                    data-cy="email-input"
                    label="Email"
                    labelType="floating"
                    {...registerChange("email")}
                  />
                  <CustomTextfield
                    data-cy="password-input"
                    label="Password"
                    labelType="floating"
                    {...registerChange("password")}
                    type="password"
                  />
                  <CustomTextfield
                    data-cy="validate-password-input"
                    label="Verify password"
                    labelType="floating"
                    {...registerChange("verifyPassword")}
                    type="password"
                  />
                  <CustomButton
                    data-cy="sign-up-submit-btn"
                    text="Sign up"
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
            <p>{t("Already have any account?")}</p>
            <CustomButton
              data-cy="go-to-sign-in-btn"
              text="Sign in"
              variant="full"
              onClick={() => handleNavigate(PATH_CONSTRANTS.SIGN_IN)}
              disableDefaultMargin
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default SignUp;

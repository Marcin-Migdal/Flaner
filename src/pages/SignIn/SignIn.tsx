import { ButtonWidth, Card, Col, Form, FormErrors, Icon, Row, useForm } from "@marcin-migdal/m-component-library";
import { LanguageType } from "i18n";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { CustomButton, CustomTextfield } from "@components/index";
import { useAppDispatch, useAppSelector } from "@hooks/redux-hooks";
import { addToast } from "@slices/toast-slice";
import { PATH_CONSTRANTS } from "@utils/enums";
import {
  SignInState,
  SignInSubmitState,
  signInInitialValues,
  signInValidationSchema,
} from "../../utils/formik-configs";

import {
  selectAuthorization,
  setAuthError,
  signInWithEmail,
  signInWithGoogle,
  signOut,
} from "@slices/authorization-slice";

import "../../commonAssets/css/auth-form.scss";

const nameSpace = "auth";
const SignIn = () => {
  const { t, i18n } = useTranslation(nameSpace);
  const navigate = useNavigate();

  const { isLoading, authFormErrors: authErrors } = useAppSelector(selectAuthorization);
  const dispatch = useAppDispatch();

  const handleSubmit = async (values: SignInSubmitState) => {
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
    <div className="page auth-from-container">
      <Card className="auth-card">
        <Row>
          <Col sm={12} mdFlex={1} className="left-col">
            <h2>{t("_Hello")}!</h2>
            <p data-cy="sign-in-description">{t("Please sign in to continue")}</p>
            <Form formik={formik}>
              {({ registerChange, isValid }) => (
                <>
                  <CustomTextfield
                    data-cy="email-input"
                    nameSpace={nameSpace}
                    label="Email"
                    labelType="floating"
                    {...registerChange("email")}
                  />
                  <CustomTextfield
                    data-cy="password-input"
                    nameSpace={nameSpace}
                    label="Password"
                    labelType="floating"
                    type="password"
                    {...registerChange("password")}
                  />
                  <CustomButton
                    data-cy="sign-in-submit-btn"
                    nameSpace={nameSpace}
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
              disableDefaultMargin
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default SignIn;

import {
  Button,
  ButtonWidth,
  Card,
  Col,
  Form,
  FormErrors,
  Icon,
  Row,
  Textfield,
  useForm,
} from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

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
      dispatch(addToast({ type: "information", message: "auth.verifyEmail" }));
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
            <h2>{t("auth.hello")}!</h2>
            <p>{t("auth.pleaseSignIn")}</p>
            <Form formik={formik}>
              {({ errors, registerChange, isValid }) => (
                <>
                  <Textfield
                    {...registerChange("email")}
                    data-testid="email-input"
                    label={t("auth.email")}
                    labelType="floating"
                    error={t(errors.email || "")}
                  />
                  <Textfield
                    {...registerChange("password")}
                    data-testid="password-input"
                    label={t("auth.password")}
                    labelType="floating"
                    type="password"
                    error={t(errors.password || "")}
                  />
                  <Button
                    text={t("auth.signIn")}
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
                {t("or")} <br /> {t("auth.signUpWith")}
              </span>
              <Icon className="google-sign-in-icon" icon={["fab", "google"]} onClick={onGoogleSignIn} />
            </div>
          </Col>
          <Col sm={12} mdFlex={1} className="right-col">
            <Icon icon={["fas", "rectangle-list"]} />
            <h2>{import.meta.env.VITE_APP_NAME}</h2>
            <p>{t("auth.noAccount")}</p>
            <Button
              text={t("auth.signUp")}
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

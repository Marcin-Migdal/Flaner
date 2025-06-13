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
import { SerializedAuthUser, signInWithGoogle, signOut, signUpWithEmail } from "@services/Authorization";
import { addToast, selectAuthorization, setAuthError } from "@slices";
import { PATH_CONSTRANTS } from "@utils/enums";
import { signUpInitialValues, SignUpState, SignUpSubmitState, signUpValidationSchema } from "@utils/formik-configs";

import "@commonAssets/css/auth-form.scss";

const SignUp = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const dispatch = useAppDispatch();
  const { isLoading, authFormErrors: authErrors } = useAppSelector(selectAuthorization);

  const handleSubmit = async (values: SignUpSubmitState) => {
    const res = await dispatch(signUpWithEmail({ ...values, language: i18n.language as LanguageType }));

    if (res.meta.requestStatus === "fulfilled" && !(res.payload as SerializedAuthUser).emailVerified) {
      dispatch(addToast({ type: "information", message: "auth.verifyEmail" }));
      dispatch(signOut());
      navigate(PATH_CONSTRANTS.SIGN_IN);
    }
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
            <h2>{t("auth.hello")}!</h2>
            <p>{t("auth.pleaseSignUp")}</p>
            <Form formik={formik}>
              {({ errors, registerChange, isValid }) => (
                <>
                  <Textfield
                    {...registerChange("username")}
                    label={t("auth.username")}
                    labelType="floating"
                    error={t(errors.username || "")}
                  />
                  <Textfield
                    {...registerChange("email")}
                    label={t("auth.email")}
                    labelType="floating"
                    error={t(errors.email || "")}
                  />
                  <Textfield
                    {...registerChange("password")}
                    label={t("auth.password")}
                    labelType="floating"
                    type="password"
                    error={t(errors.password || "")}
                  />
                  <Textfield
                    {...registerChange("verifyPassword")}
                    label={t("auth.verifyPassword")}
                    labelType="floating"
                    type="password"
                    error={t(errors.verifyPassword || "")}
                  />
                  <Button
                    text={t("auth.signUp")}
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
            <p>{t("auth.haveAccount")}</p>
            <Button
              text={t("auth.signIn")}
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

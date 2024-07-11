import { Card, Col, Form, Icon, Row } from "@Marcin-Migdal/morti-component-library";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { CustomButton, CustomTextfield, Page } from "@components/index";
import { useAppDispatch, useAppSelector } from "@hooks/redux-hooks";
import { selectAuthorization, setAuthError, signInWithGoogle, signUpWithEmail } from "@slices/index";
import { PATH_CONSTRANTS } from "@utils/enums";
import { ISignUpState, signUpInitialValues, signUpValidationSchema } from "./sign-up-formik-config";

import "../../commonAssets/css/auth-form.scss";

const nameSpace: string = "auth";
const SignUp = () => {
    const navigate = useNavigate();
    const { t } = useTranslation(nameSpace);

    const dispatch = useAppDispatch();
    const { isLoading, authFormErrors: authErrors } = useAppSelector(selectAuthorization);

    const handleSubmit = async (values) => {
        dispatch(signUpWithEmail({ ...values, language: "pl", t: t }))
            .unwrap()
            .then((user) => {
                if (!user.emailVerified) navigate(PATH_CONSTRANTS.SIGN_IN);
            });
    };

    const onGoogleSignIn = async () => dispatch(signInWithGoogle({ language: "pl" }));

    const handleAuthErrorChange = (authErrors) => dispatch(setAuthError(authErrors));

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
                        <p data-cy="sign-up-description">{t("Please sign up to continue")}</p>
                        <Form<ISignUpState>
                            initialValues={signUpInitialValues}
                            validationSchema={signUpValidationSchema}
                            onSubmit={handleSubmit}
                            externalErrors={authErrors}
                            onExternalErrorChange={handleAuthErrorChange}
                        >
                            {({ values, errors, handleBlur, handleChange, isValid }) => (
                                <>
                                    <CustomTextfield
                                        data-cy="username-input"
                                        nameSpace={nameSpace}
                                        label="Username"
                                        name="username"
                                        value={values.username}
                                        error={errors.username}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        labelType="floating"
                                    />
                                    <CustomTextfield
                                        data-cy="email-input"
                                        nameSpace={nameSpace}
                                        label="Email"
                                        name="email"
                                        value={values.email}
                                        error={errors.email}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        labelType="floating"
                                    />
                                    <CustomTextfield
                                        data-cy="password-input"
                                        nameSpace={nameSpace}
                                        label="Password"
                                        name="password"
                                        value={values.password}
                                        error={errors.password}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        labelType="floating"
                                        type="password"
                                    />
                                    <CustomTextfield
                                        data-cy="validate-password-input"
                                        nameSpace={nameSpace}
                                        label="Verify password"
                                        name="verifyPassword"
                                        value={values.verifyPassword}
                                        error={errors.verifyPassword}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        labelType="floating"
                                        type="password"
                                    />
                                    <CustomButton
                                        data-cy="sign-up-submit-btn"
                                        nameSpace={nameSpace}
                                        text="Sign up"
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
                        <p>{t("Already have any account?")}</p>
                        <CustomButton
                            data-cy="go-to-sign-in-btn"
                            nameSpace={nameSpace}
                            text="Sign in"
                            variant="full"
                            onClick={() => handleNavigate(PATH_CONSTRANTS.SIGN_IN)}
                        />
                    </Col>
                </Row>
            </Card>
        </Page>
    );
};

export default SignUp;

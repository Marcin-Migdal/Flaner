import { Card, Col, Form, Icon, Row } from "@Marcin-Migdal/morti-component-library";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import React from "react";

import { ISignUpState, signUpInitialValues, signUpValidationSchema } from "./sign-up-formik-config";
import { setAuthError, signUpWithEmail, signInWithGoogle } from "@slices/authorization-slice";
import { useAppDispatch, useAppSelector } from "@hooks/redux-hooks";
import { CustomButton, CustomInput } from "@components/index";
import { PATH_CONSTRANTS } from "@utils/enums";

import "@commonAssets/css/auth-form.css";

const nameSpace: string = "auth";
const SignUp = () => {
    const navigate = useNavigate();
    const { t } = useTranslation([nameSpace]);

    const dispatch = useAppDispatch();
    const { isLoading, authFormErrors: authErrors } = useAppSelector((store) => store.authorization);

    const handleSubmit = async (values) => dispatch(signUpWithEmail({ ...values, language: "pl", t: t }));

    const onGoogleSignIn = async () => dispatch(signInWithGoogle({ language: "pl", t: t }));

    const handleAuthErrorChange = (authErrors) => dispatch(setAuthError(authErrors));

    const handleNavigate = (to: PATH_CONSTRANTS) => {
        dispatch(setAuthError({}));
        navigate(to);
    };

    return (
        <div className="auth-from-container">
            <Card className="auth-card">
                <Row>
                    <Col xl={6} className="left-col">
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
                                    <CustomInput
                                        data-cy="userName-input"
                                        i18NameSpace={nameSpace}
                                        label="Username"
                                        name="userName"
                                        value={values.userName}
                                        error={errors.userName}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    />
                                    <CustomInput
                                        data-cy="email-input"
                                        i18NameSpace={nameSpace}
                                        label="Email"
                                        name="email"
                                        value={values.email}
                                        error={errors.email}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    />
                                    <CustomInput
                                        data-cy="password-input"
                                        i18NameSpace={nameSpace}
                                        label="Password"
                                        name="password"
                                        value={values.password}
                                        error={errors.password}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        type="password"
                                    />
                                    <CustomInput
                                        data-cy="validate-password-input"
                                        i18NameSpace={nameSpace}
                                        label="Verify password"
                                        name="verifyPassword"
                                        value={values.verifyPassword}
                                        error={errors.verifyPassword}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        type="password"
                                    />
                                    <CustomButton
                                        data-cy="sign-up-submit-btn"
                                        i18NameSpace={nameSpace}
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
                    <Col xl={6} className="right-col">
                        <Icon icon={["fas", "rectangle-list"]} />
                        <h2>APP NAME</h2>
                        <p>{t("Already have any account?")}</p>
                        <CustomButton
                            data-cy="go-to-sign-in-btn"
                            i18NameSpace={nameSpace}
                            text="Sign in"
                            variant="full"
                            onClick={() => handleNavigate(PATH_CONSTRANTS.SIGN_IN)}
                        />
                    </Col>
                </Row>
            </Card>
        </div>
    );
};

export default SignUp;

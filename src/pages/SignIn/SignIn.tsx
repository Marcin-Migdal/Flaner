import { Card, Col, Form, FormErrorsType, Icon, Row } from "@Marcin-Migdal/morti-component-library";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import React from "react";

import { ISignInState, signInInitialValues, signInValidationSchema } from "./sign-in-formik-config";
import { setAuthError, signInWithEmail, signInWithGoogle } from "@slices/authorization-slice";
import { useAppDispatch, useAppSelector } from "@hooks/redux-hooks";
import { CustomButton, CustomInput } from "@components/index";
import { PATH_CONSTRANTS } from "@utils/enums";

import "@commonAssets/css/auth-form.css";

const nameSpace: string = "auth";
const SignIn = () => {
    const { t, i18n } = useTranslation([nameSpace]);
    const navigate = useNavigate();

    const { isLoading, authFormErrors: authErrors } = useAppSelector((store) => store.authorization);
    const dispatch = useAppDispatch();

    const handleSubmit = async (values: ISignInState) => dispatch(signInWithEmail({ ...values, t: t }));

    const onGoogleSignIn = async () => dispatch(signInWithGoogle({ language: i18n.language, t: t }));

    const handleAuthErrorChange = (authError: FormErrorsType<ISignInState>) => dispatch(setAuthError(authError));

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
                                    <CustomInput
                                        data-cy="email-input"
                                        i18NameSpace={nameSpace}
                                        label="Email"
                                        name="email"
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        value={values.email}
                                        error={errors.email}
                                    />
                                    <CustomInput
                                        data-cy="password-input"
                                        i18NameSpace={nameSpace}
                                        label="Password"
                                        name="password"
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        value={values.password}
                                        error={errors.password}
                                        type="password"
                                    />
                                    <CustomButton
                                        data-cy="sign-in-submit-btn"
                                        i18NameSpace={nameSpace}
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
                    <Col xl={6} className="right-col">
                        <Icon icon={["fas", "rectangle-list"]} />
                        <h2>APP NAME</h2>
                        <p>{t("Don't have any account?")}</p>
                        <CustomButton
                            data-cy="go-to-sign-up-btn"
                            i18NameSpace={nameSpace}
                            text="Sign up"
                            variant="full"
                            onClick={() => handleNavigate(PATH_CONSTRANTS.SIGN_UP)}
                        />
                    </Col>
                </Row>
            </Card>
        </div>
    );
};

export default SignIn;

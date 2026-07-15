import { useAuth } from "@flaner-v2/shared";
import { Button, FormTextField, GoogleIcon } from "@flaner-v2/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { getLoginSchema, getSignUpSchema, type LoginFormData, type SignUpFormData } from "../utils/schemas";

export function AuthView() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { signInWithGoogleUser, signInWithEmailUser, signUpWithEmailUser } = useAuth();
  const { t } = useTranslation("auth");

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(getLoginSchema(t)),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(getSignUpSchema(t)),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  const onLogin = async (data: LoginFormData) => {
    setAuthError(null);
    try {
      await signInWithEmailUser(data.email, data.password);
    } catch (err: any) {
      console.error(err);
      setAuthError(t("errors.loginFailed"));
    }
  };

  const onSignUp = async (data: SignUpFormData) => {
    setAuthError(null);
    try {
      await signUpWithEmailUser(data.email, data.password, data.username, "pl");
    } catch (err: any) {
      console.error(err);
      setAuthError(t("errors.registrationFailed"));
    }
  };

  const onGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogleUser("pl");
    } catch (err: any) {
      console.error(err);
      setAuthError(t("errors.googleFailed"));
    }
  };

  const toggleMode = () => {
    setAuthError(null);
    setIsSignUp(!isSignUp);
    loginForm.reset();
    signUpForm.reset();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-wider text-brand mb-1">FLANER</h1>
          <p className="text-muted-foreground text-sm">{isSignUp ? t("signUpSubtitle") : t("signInSubtitle")}</p>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs text-center font-medium">
            {authError}
          </div>
        )}

        {/* Google OAuth Button */}
        <Button onClick={onGoogleSignIn} type="button" size="xl" variant="outline" className="w-full hover:bg-accent/40 transition-colors">
          <span className="flex items-center justify-center gap-3 w-full">
            <GoogleIcon />
            {t("googleButton")}
          </span>
        </Button>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-4 text-muted-foreground/60 text-xs uppercase tracking-wider font-semibold">{t("or")}</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        {/* Credentials Form */}
        {isSignUp ? (
          <FormProvider {...signUpForm}>
            <form key="signup-form" onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4 text-left">
              <FormTextField 
                name="username" 
                label={t("usernameLabel")} 
                placeholder={t("usernamePlaceholder")} 
              />

              <FormTextField 
                name="email" 
                type="email" 
                label={t("emailLabel")} 
                placeholder={t("emailPlaceholder")} 
              />

              <FormTextField 
                name="password" 
                type="password" 
                label={t("passwordLabel")} 
                placeholder={t("passwordPlaceholderSignUp")} 
              />

              <Button type="submit" size="xl" variant="brand" className="w-full mt-2">
                {t("signUpButton")}
              </Button>
            </form>
          </FormProvider>
        ) : (
          <FormProvider {...loginForm}>
            <form key="login-form" onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4 text-left">
              <FormTextField 
                name="email" 
                type="email" 
                label={t("emailLabel")} 
                placeholder={t("emailPlaceholder")} 
              />

              <FormTextField 
                name="password" 
                type="password" 
                label={t("passwordLabel")} 
                placeholder={t("passwordPlaceholderLogin")} 
              />

              <Button type="submit" size="xl" variant="brand" className="w-full mt-2">
                {t("signInButton")}
              </Button>
            </form>
          </FormProvider>
        )}

        {/* Toggle Mode Link */}
        <div className="text-center text-sm">
          <span className="text-muted-foreground/75">{isSignUp ? t("toggleSignInText") : t("toggleSignUpText")}</span>
          <button
            onClick={toggleMode}
            type="button"
            className="text-brand hover:underline font-semibold focus:outline-none cursor-pointer"
          >
            {isSignUp ? t("signInButton") : t("signUpButton")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthView;

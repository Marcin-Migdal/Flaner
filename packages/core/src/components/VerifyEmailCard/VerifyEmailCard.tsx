import { useAuth } from "@flaner/shared/context";
import type { LanguageType } from "@flaner/shared/types";
import { toast } from "@flaner/shared/utils";
import { Alert, AlertDescription, AlertTitle, Button } from "@flaner/ui-components";
import { FirebaseError } from "firebase/app";
import { MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const RESEND_COOLDOWN_SECONDS = 60;

type VerifyEmailCardProps = {
  email: string;
  language: LanguageType;
};

export function VerifyEmailCard({ email, language }: VerifyEmailCardProps) {
  const { resendVerificationEmail, confirmEmailVerification, signOutUser } = useAuth();
  const { t } = useTranslation("auth");
  const [cooldown, setCooldown] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Coming back from the email (another tab or app) lets the user in without a click
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      confirmEmailVerification().catch((error) => console.error("Failed to check the email verification", error));
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [confirmEmailVerification]);

  const onConfirm = async () => {
    setIsConfirming(true);
    try {
      if (!(await confirmEmailVerification())) toast.failure(t("verifyEmail.notConfirmed"));
    } catch (error) {
      console.error(error);
      toast.failure(t("errors.loginFailed"));
    } finally {
      setIsConfirming(false);
    }
  };

  const onResend = async () => {
    setIsResending(true);
    try {
      await resendVerificationEmail(language);
      toast.success(t("verifyEmail.resent"));
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      console.error(error);
      const tooMany = error instanceof FirebaseError && error.code === "auth/too-many-requests";
      toast.failure(t(tooMany ? "verifyEmail.tooManyRequests" : "verifyEmail.resendFailed"));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <MailCheck />
        <AlertTitle>{t("verifyEmail.title")}</AlertTitle>
        <AlertDescription>
          <p>{t("verifyEmail.description", { email })}</p>
        </AlertDescription>
      </Alert>

      <Button type="button" size="xl" variant="brand" className="w-full" onClick={onConfirm} isBusy={isConfirming}>
        {t("verifyEmail.confirmButton")}
      </Button>

      <Button
        type="button"
        size="xl"
        variant="outline"
        className="w-full"
        onClick={onResend}
        isBusy={isResending}
        disabled={cooldown > 0}
      >
        {cooldown > 0 ? t("verifyEmail.resendCooldown", { seconds: cooldown }) : t("verifyEmail.resendButton")}
      </Button>

      <div className="text-center text-sm">
        <button
          type="button"
          onClick={signOutUser}
          className="text-brand-text hover:underline font-semibold focus:outline-none cursor-pointer"
        >
          {t("verifyEmail.useAnotherAccount")}
        </button>
      </div>
    </div>
  );
}

export default VerifyEmailCard;

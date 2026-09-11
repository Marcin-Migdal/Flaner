import { useAuth } from "@flaner/shared/context";
import { compressImage, ONE_MB, toast, uploadToCloudinary } from "@flaner/shared/utils";
import {
  Button,
  ConfirmationPopup,
  FormImagePicker,
  FormSelect,
  FormSwitch,
  FormTextField,
  Separator,
} from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { useSettingsTranslations, useUnsavedChangesWarning, useUpdateSettingsMutation } from "../hooks";
import getSettingsSchema, { type SettingsFormData } from "../utils/schemas/settings-schema";
import { settingsViewStyles } from "./SettingsView.styles";

export function SettingsView() {
  const { user } = useAuth();
  const { t, i18n } = useSettingsTranslations();
  const navigate = useNavigate();
  const mutation = useUpdateSettingsMutation();

  const settingsForm = useForm<SettingsFormData>({
    resolver: zodResolver(getSettingsSchema(t)),
    values: user
      ? {
          username: user.username || "",
          language: user.language || "pl",
          darkMode: user.darkMode ?? true,
          avatar: user.avatarUrl || null,
        }
      : undefined,
    resetOptions: {
      keepDirtyValues: true,
    },
  });

  const {
    handleSubmit,
    reset,
    formState: { isDirty },
  } = settingsForm;

  const blocker = useUnsavedChangesWarning(isDirty);

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    let avatarUrl = typeof data.avatar === "string" ? data.avatar : user?.avatarUrl || "";

    if (data.avatar instanceof File) {
      try {
        // Compress avatar (max 1MB)
        const compressed = await compressImage(data.avatar, ONE_MB);
        // Upload to Cloudinary
        avatarUrl = await uploadToCloudinary(compressed);
      } catch (err) {
        console.error(err);
        toast.failure((err as Error)?.message || t("notifications.avatarError"));
        return;
      }
    } else if (data.avatar === null) {
      avatarUrl = "";
    }

    const payload = {
      username: data.username as string,
      language: data.language as "pl" | "en",
      darkMode: data.darkMode as boolean,
      avatarUrl,
    };

    mutation.mutate(payload, {
      onSuccess: () => {
        // Sync global app translation language immediately
        i18n.changeLanguage(data.language as string);
        reset(data);
      },
      onError: (err) => {
        console.error(err);
      },
    });
  };

  // Get initials for placeholder avatar
  const getInitials = () => {
    if (!user?.username) return "FL";
    return user.username.slice(0, 2).toUpperCase();
  };

  const languageOptions = [
    { value: "en", label: t("preferences.langs.en") },
    { value: "pl", label: t("preferences.langs.pl") },
  ];

  return (
    <div className={settingsViewStyles.root}>
      {/* Back button header (Path 1) */}
      <div
        className={settingsViewStyles.backButtonContainer}
        onClick={handleBack}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleBack();
          }
        }}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={settingsViewStyles.backButton}
          aria-label={t("actions.back")}
          onClick={(e) => {
            e.stopPropagation();
            handleBack();
          }}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <span className={settingsViewStyles.backText}>{t("actions.back")}</span>
      </div>

      <h1 className={settingsViewStyles.title}>{t("title")}</h1>

      <FormProvider {...settingsForm}>
        <form onSubmit={handleSubmit(onSubmit)} className={settingsViewStyles.form}>
          {/* Section 1: Profile Details */}
          <div className={settingsViewStyles.sectionGrid}>
            <div className={settingsViewStyles.sectionHeader}>
              <h2 className={settingsViewStyles.sectionTitle}>{t("profile.sectionTitle")}</h2>
              <p className={settingsViewStyles.sectionDesc}>{t("profile.sectionDesc")}</p>
            </div>

            <div className={settingsViewStyles.card}>
              {/* Static Avatar Preview Block */}
              <div className={settingsViewStyles.avatarWrapper}>
                <div className="relative">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="Avatar Preview"
                      className={settingsViewStyles.avatarPreview}
                      onError={(e) => {
                        // Fallback on broken URL
                        (e.target as HTMLImageElement).src =
                          `https://api.dicebear.com/7.x/initials/svg?seed=${user?.username || "User"}`;
                      }}
                    />
                  ) : (
                    <div className={settingsViewStyles.avatarPlaceholder}>
                      {getInitials()}
                    </div>
                  )}
                </div>
                <div className={settingsViewStyles.profileInfo}>
                  <h3 className={settingsViewStyles.profileUsername}>{user?.username}</h3>
                  <p className={settingsViewStyles.profileEmail}>{user?.email}</p>
                </div>
              </div>

              <div className={settingsViewStyles.fieldsSpacing}>
                <FormTextField
                  name="username"
                  label={t("profile.username")}
                  placeholder={t("profile.usernamePlaceholder")}
                />

                <FormImagePicker
                  name="avatar"
                  label={t("profile.avatar")}
                  description={t("profile.avatarDesc")}
                  maxSize={ONE_MB} // 1MB
                  cropShape="round"
                />
              </div>
            </div>
          </div>

          <Separator className={settingsViewStyles.separator} />

          {/* Section 2: Preferences */}
          <div className={settingsViewStyles.sectionGrid}>
            <div className={settingsViewStyles.sectionHeader}>
              <h2 className={settingsViewStyles.sectionTitle}>{t("preferences.sectionTitle")}</h2>
              <p className={settingsViewStyles.sectionDesc}>{t("preferences.sectionDesc")}</p>
            </div>

            <div className={settingsViewStyles.card}>
              <FormSelect
                name="language"
                label={t("preferences.language")}
                description={t("preferences.languageDesc")}
                options={languageOptions}
                isSearchable={false}
              />

              <FormSwitch
                name="darkMode"
                label={t("preferences.darkMode")}
                description={t("preferences.darkModeDesc")}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className={settingsViewStyles.actionsContainer}>
            <Button
              type="submit"
              variant="brand"
              disabled={!isDirty}
              isBusy={mutation.isPending}
              className={settingsViewStyles.submitButton}
            >
              {t("actions.save")}
            </Button>
          </div>
        </form>
      </FormProvider>

      {/* Confirmation popup when attempting to leave with unsaved changes */}
      <ConfirmationPopup
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open && blocker.state === "blocked") {
            blocker.reset?.();
          }
        }}
        title={t("unsavedChanges.title")}
        description={t("unsavedChanges.description")}
        confirmLabel={t("unsavedChanges.discard")}
        cancelLabel={t("unsavedChanges.stay")}
        variant="destructive"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </div>
  );
}
export default SettingsView;

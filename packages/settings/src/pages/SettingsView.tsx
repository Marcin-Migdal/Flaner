import { compressImage, ONE_MB, toast, uploadToCloudinary } from "@flaner/shared/utils";
import { useAuth } from "@flaner/shared/context";
import { Button, FormImagePicker, FormSelect, FormSwitch, FormTextField, Separator } from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useUpdateSettingsMutation } from "../hooks";
import { useSettingsTranslations } from "../hooks/useSettingsTranslations";
import getSettingsSchema, { type SettingsFormData } from "../utils/schemas/settings-schema";

export function SettingsView() {
  const { user } = useAuth();
  const { t, i18n } = useSettingsTranslations();
  const mutation = useUpdateSettingsMutation();

  const settingsForm = useForm<SettingsFormData>({
    resolver: zodResolver(getSettingsSchema(t)),
    defaultValues: {
      username: user?.username || "",
      language: user?.language || "pl",
      darkMode: user?.darkMode ?? true,
      avatar: user?.avatarUrl || null,
    },
  });

  const {
    handleSubmit,
    reset,
    formState: { isDirty },
  } = settingsForm;

  // Keep form in sync if auth user details load later
  useEffect(() => {
    if (user) {
      reset({
        username: user.username,
        language: user.language,
        darkMode: user.darkMode,
        avatar: user.avatarUrl || null,
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: SettingsFormData) => {
    let avatarUrl = user?.avatarUrl || "";

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
    <div className="max-w-4xl mx-auto py-4">
      <h1 className="text-3xl font-black tracking-tight text-foreground mb-8 font-heading">{t("title")}</h1>

      <FormProvider {...settingsForm}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Section 1: Profile Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <h2 className="text-lg font-bold text-foreground/90">{t("profile.sectionTitle")}</h2>
              <p className="text-xs text-muted-foreground mt-1">{t("profile.sectionDesc")}</p>
            </div>

            <div className="md:col-span-2 bg-card/40 border border-border rounded-xl p-6 shadow-xl space-y-6">
              {/* Static Avatar Preview Block */}
              <div className="flex items-center gap-5">
                <div className="relative">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="Avatar Preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-border bg-background"
                      onError={(e) => {
                        // Fallback on broken URL
                        (e.target as HTMLImageElement).src =
                          `https://api.dicebear.com/7.x/initials/svg?seed=${user?.username || "User"}`;
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand to-brand-dark flex items-center justify-center text-zinc-950 font-black text-xl border-2 border-brand/20 shadow-md">
                      {getInitials()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground/80">{user?.username}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-4">
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
                />
              </div>
            </div>
          </div>

          <Separator className="border-border" />

          {/* Section 2: Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <h2 className="text-lg font-bold text-foreground/90">{t("preferences.sectionTitle")}</h2>
              <p className="text-xs text-muted-foreground mt-1">{t("preferences.sectionDesc")}</p>
            </div>

            <div className="md:col-span-2 bg-card/40 border border-border rounded-xl p-6 shadow-xl space-y-6">
              <FormSelect
                name="language"
                label={t("preferences.language")}
                description={t("preferences.languageDesc")}
                options={languageOptions}
              />

              <FormSwitch
                name="darkMode"
                label={t("preferences.darkMode")}
                description={t("preferences.darkModeDesc")}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="submit"
              variant="brand"
              disabled={!isDirty}
              isBusy={mutation.isPending}
              className="px-6 h-10 shadow-lg shadow-brand/10"
            >
              {t("actions.save")}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
export default SettingsView;

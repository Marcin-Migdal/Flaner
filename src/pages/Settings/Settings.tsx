import deepEqual from "fast-deep-equal";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Accordion,
  Button,
  ColorPreviewSquare,
  Dropdown,
  hslToHex,
  ImageField,
  MInputChangeEvent,
  Textfield,
  ToggleSwitch,
  useAlert,
} from "@marcin-migdal/m-component-library";

import { useAppDispatch, useAppSelector } from "@hooks";
import { availableLanguages, LanguageType, lngLabelMap } from "@i18n";
import { firestoreApi } from "@services/api";
import { EditUserRequest, useEditUserMutation } from "@services/Users";
import { addToast, AuthUser, selectAuthorization, setAuthUser } from "@slices";
import { defaultThemeHue } from "@utils/constants";
import { DropdownOption } from "@utils/types";

import { AccordionSettingsSectionToggle } from "./Components/AccordionSettingsSectionToggle/AccordionSettingsSectionToggle";
import { HuePopup } from "./Components/HuePopup/HuePopup";

import "./styles.scss";

type AuthUserSettings = Required<Omit<EditUserRequest, "currentUserUid">>;

const createEditUserRequest = (authUser: AuthUser): AuthUserSettings => {
  return {
    themeColorHue: authUser.themeColorHue,
    darkMode: authUser.darkMode,
    language: authUser.language,
    username: authUser.username,
    avatarUrl: authUser.avatarUrl,
  };
};

const Settings = () => {
  const dispatch = useAppDispatch();
  const { authUser } = useAppSelector(selectAuthorization);
  const { i18n, t } = useTranslation();

  const [handleOpenAlert, alertProps] = useAlert();

  const [authUserSettings, setAuthUserSettings] = useState<AuthUserSettings | undefined>(undefined);

  const didSettingsChange =
    authUserSettings && authUser ? !deepEqual(createEditUserRequest(authUser), authUserSettings) : false;

  const [editUser] = useEditUserMutation();

  const currentLanguageOption: DropdownOption<LanguageType> | undefined = authUserSettings
    ? {
        label: lngLabelMap[authUserSettings.language],
        value: authUserSettings.language,
      }
    : undefined;

  const currentThemeHue: number = authUserSettings?.themeColorHue || defaultThemeHue;

  useEffect(() => {
    const handleSetAuthUserSettings = () => {
      if (!authUser) {
        return;
      }

      setAuthUserSettings(createEditUserRequest(authUser));
    };

    handleSetAuthUserSettings();
  }, [authUser]);

  const handleOpenHuePopup = () => {
    handleOpenAlert();
  };

  const handleChangeThemeColorHue = (selectedHue: number) => {
    if (!authUserSettings) {
      return;
    }

    setAuthUserSettings({ ...authUserSettings, themeColorHue: selectedHue });
  };

  const handleSettingsChange = (event: MInputChangeEvent<string | boolean | DropdownOption<LanguageType>>) => {
    if (!authUserSettings) {
      return;
    }

    const { name, value } = event.target;

    setAuthUserSettings({ ...authUserSettings, [name]: typeof value === "object" ? value.value : value });
  };

  const handleSettingsSave = () => {
    editUser({ currentUserUid: authUser?.uid, ...authUserSettings })
      .unwrap()
      .then(() => {
        authUser && dispatch(setAuthUser({ ...authUser, ...authUserSettings }));
        i18n.changeLanguage(authUserSettings?.language);

        dispatch(firestoreApi.util.resetApiState());
        dispatch(addToast({ type: "success", message: "common.status.success" }));
      });
  };

  const revertSettings = () => {
    if (!authUser) {
      return;
    }

    setAuthUserSettings(createEditUserRequest(authUser));
  };

  const handleAvatarChange = async () => {};

  const hexColor = hslToHex(currentThemeHue, 80, 50);

  return (
    <div className="page single-column settings-page">
      <Accordion instanceClassName="settings" expansionMode="multiple">
        <Accordion.Section sectionId="language">
          <AccordionSettingsSectionToggle
            title={t("settings.languageTitle")}
            description={t("settings.languageDescription")}
          />
          <Accordion.Content>
            <Dropdown
              name="language"
              value={currentLanguageOption}
              options={availableLanguages}
              onChange={(event) => handleSettingsChange(event)}
              marginBottomType="none"
            />
          </Accordion.Content>
        </Accordion.Section>
        <Accordion.Section sectionId="theme">
          <AccordionSettingsSectionToggle
            title={t("settings.themeTitle")}
            description={t("settings.themeDescription")}
          />
          <Accordion.Content>
            <div className="hue-placeholder-container">
              <Textfield
                label={t("settings.themeColor")}
                onClick={handleOpenHuePopup}
                value={hexColor}
                readOnly
                classNamesObj={{ containerClassName: "mr-2-rem" }}
                labelWidth={26}
                marginBottomType="none"
              />
              <ColorPreviewSquare onClick={handleOpenHuePopup} color={hexColor} />
            </div>
            <ToggleSwitch
              label={t("settings.darkMode")}
              name="darkMode"
              checked={authUserSettings?.darkMode}
              onChange={handleSettingsChange}
              marginBottomType="none"
            />
          </Accordion.Content>
        </Accordion.Section>
        <Accordion.Section sectionId="profile">
          <AccordionSettingsSectionToggle
            title={t("settings.profileTitle")}
            description={t("settings.profileDescription")}
          />
          <Accordion.Content>
            <Textfield
              name="username"
              value={authUserSettings?.username}
              label={t("settings.displayName")}
              classNamesObj={{ containerClassName: "mt-4-rem" }}
              onChange={handleSettingsChange}
              debounceDelay={300}
            />
            <ImageField label={t("settings.avatar")} onChange={handleAvatarChange} marginBottomType="none" disabled />
          </Accordion.Content>
        </Accordion.Section>
      </Accordion>
      <HuePopup hue={currentThemeHue} {...alertProps} onConfirm={handleChangeThemeColorHue} />
      <div className="buttons-container">
        <Button
          display={didSettingsChange}
          text={t("common.actions.save")}
          className="ml-auto"
          onClick={handleSettingsSave}
          disableDefaultMargin
        />
        <Button
          display={didSettingsChange}
          text={t("common.actions.revert")}
          onClick={revertSettings}
          icon={["fas", "undo"]}
          disableDefaultMargin
        />
      </div>
    </div>
  );
};

export default Settings;

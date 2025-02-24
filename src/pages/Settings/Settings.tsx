import { DropdownValue } from "@marcin-migdal/m-component-library/build/components/Inputs/Dropdown/types";
import deepEqual from "fast-deep-equal";
import { availableLanguages, LanguageType, lngLabelMap } from "i18n";
import { ChangeEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Accordion,
  ColorPreviewSquare,
  Dropdown,
  DropdownChangeEvent,
  hslToHex,
  ImageField,
  Textfield,
  ToggleSwitch,
  useAlert,
} from "@marcin-migdal/m-component-library";

import { CustomButton } from "@components/CustomButton";
import { Page } from "@components/Layout";
import { useAppDispatch, useAppSelector } from "@hooks/redux-hooks";
import { EditUserRequest, useEditUserMutation } from "@services/users";
import { AuthUserConfigType, selectAuthorization, setAuthUser } from "@slices/authorization-slice";
import { addToast } from "@slices/toast-slice";
import { defaultThemeHue } from "@utils/constants/theme-hue";
import { DropdownOption } from "@utils/types/DropdownOption";
import { AccordionSettingsSectionToggle } from "./Components/AccordionSettingsSectionToggle/AccordionSettingsSectionToggle";
import { HuePopup } from "./Components/HuePopup/HuePopup";

import "./styles.scss";

type AuthUserSettings = Required<Omit<EditUserRequest, "currentUserUid">>;

const createEditUserRequest = (authUser: AuthUserConfigType): AuthUserSettings => {
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
  const { i18n } = useTranslation();

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

  const handleSettingsChange = (
    event: ChangeEvent<HTMLInputElement> | DropdownChangeEvent<DropdownOption<LanguageType>>,
    value: string | boolean | DropdownValue<DropdownOption<LanguageType>>
  ) => {
    if (!authUserSettings) {
      return;
    }

    const name = event.target.name;

    setAuthUserSettings({ ...authUserSettings, [name as string]: typeof value === "object" ? value.value : value });
  };

  const handleSettingsSave = () => {
    editUser({ currentUserUid: authUser?.uid, ...authUserSettings })
      .unwrap()
      .then(() => {
        authUser && dispatch(setAuthUser({ ...authUser, ...authUserSettings }));
        i18n.changeLanguage(authUserSettings?.language);

        dispatch(addToast({ type: "success", message: "Settings has been successfully saved." }));
      });
  };

  const revertSettings = () => {
    if (!authUser) {
      return;
    }

    setAuthUserSettings(createEditUserRequest(authUser));
  };

  const handleAvatarChange = async (event) => {};

  const hexColor = hslToHex(currentThemeHue, 80, 50);

  return (
    <Page flex flex-column className="single-column-page-container settings-page">
      <Accordion expansionMode="multiple">
        <Accordion.Section sectionId="language">
          <AccordionSettingsSectionToggle title="Language" description="Choose your application language" />
          <Accordion.Content>
            <Dropdown
              name="language"
              value={currentLanguageOption}
              options={availableLanguages}
              onChange={(event, value) => handleSettingsChange(event, value)}
              disableDefaultMargin
            />
          </Accordion.Content>
        </Accordion.Section>
        <Accordion.Section sectionId="theme">
          <AccordionSettingsSectionToggle title="Theme" description="Choose your application theme and mode" />
          <Accordion.Content>
            <div className="hue-placeholder-container">
              <Textfield
                label="Theme color"
                onClick={handleOpenHuePopup}
                value={hexColor}
                readOnly
                classNamesObj={{ container: "mr-2-rem" }}
                labelWidth={26}
                disableDefaultMargin
              />
              <ColorPreviewSquare onClick={handleOpenHuePopup} color={hexColor} />
            </div>
            <ToggleSwitch
              label="Dark Mode"
              name="darkMode"
              labelWidth={25}
              checked={authUserSettings?.darkMode}
              onChange={handleSettingsChange}
              disableDefaultMargin
            />
          </Accordion.Content>
        </Accordion.Section>
        <Accordion.Section sectionId="profile">
          <AccordionSettingsSectionToggle title="Profile" description="Edit profile information" />
          <Accordion.Content>
            <Textfield
              name="username"
              value={authUserSettings?.username}
              label="Display name"
              classNamesObj={{ container: "mt-4-rem" }}
              labelWidth={25}
              onChange={handleSettingsChange}
              debounceDelay={300}
            />
            <ImageField label="Avatar" labelWidth={25} onChange={handleAvatarChange} disableDefaultMargin disabled />
          </Accordion.Content>
        </Accordion.Section>
      </Accordion>
      <HuePopup hue={currentThemeHue} {...alertProps} onConfirm={handleChangeThemeColorHue} />
      <div className="flex mt-2-rem g-2-rem">
        <CustomButton
          display={didSettingsChange}
          text="Save settings"
          className="ml-auto"
          onClick={handleSettingsSave}
          disableDefaultMargin
        />
        <CustomButton
          display={didSettingsChange}
          text="Revert"
          onClick={revertSettings}
          icon={["fas", "undo"]}
          disableDefaultMargin
        />
      </div>
    </Page>
  );
};

export default Settings;

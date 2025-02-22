import { availableLanguages, LanguageType, lngLabelMap } from "i18n";
import { useTranslation } from "react-i18next";

import {
  ColorPreviewSquare,
  Dropdown,
  DropdownChangeEvent,
  hslToHex,
  Textfield,
  useAlert,
} from "@marcin-migdal/m-component-library";

import { CustomButton } from "@components/CustomButton";
import { Page } from "@components/Layout";
import { useAppDispatch, useAppSelector } from "@hooks/redux-hooks";
import { useEditUserMutation } from "@services/users";
import { selectAuthorization, setAuthUser } from "@slices/authorization-slice";
import { defaultThemeHue } from "@utils/constants/theme-hue";
import { DropdownOption } from "@utils/types/DropdownOption";
import { HuePopup } from "./Components/HuePopup/HuePopup";
import { SettingsSection } from "./Components/SettingsSection/SettingsSection";

import "./styles.scss";

const Settings = () => {
  const dispatch = useAppDispatch();
  const { authUser } = useAppSelector(selectAuthorization);
  const { i18n } = useTranslation();

  const [handleOpenAlert, alertProps] = useAlert();

  const [editUser] = useEditUserMutation();

  const currentLanguageOption: DropdownOption<LanguageType> = {
    label: lngLabelMap[i18n.language],
    value: i18n.language as LanguageType,
  };
  const currentThemeHue: number = authUser?.themeColorHue || defaultThemeHue;

  const handleLngChange = (event: DropdownChangeEvent<DropdownOption<LanguageType>>) => {
    const selectedOption = event.target.value?.value!;

    editUser({ currentUserUid: authUser?.uid, language: selectedOption })
      .unwrap()
      .then(() => {
        i18n.changeLanguage(selectedOption);

        authUser && dispatch(setAuthUser({ ...authUser, language: selectedOption }));
      })
      .catch(() => {});
  };

  const handleOpenHuePopup = () => {
    handleOpenAlert();
  };

  const handleConfirm = (selectedHue: number) => {
    editUser({ currentUserUid: authUser?.uid, themeColorHue: selectedHue })
      .unwrap()
      .then(() => {
        authUser && dispatch(setAuthUser({ ...authUser, themeColorHue: selectedHue }));
      })
      .catch(() => {});
  };

  const hexColor = hslToHex(currentThemeHue, 80, 50);

  return (
    <Page flex flex-column className="settings-page">
      <SettingsSection title="Language" description="Choose your application language">
        <div className="language-input-row">
          <Dropdown
            value={currentLanguageOption}
            options={availableLanguages}
            onChange={handleLngChange}
            disableDefaultMargin
          />
          <CustomButton onClick={() => i18n.changeLanguage("pl")} text="Revert" icon={["fas", "undo"]} />
        </div>
      </SettingsSection>
      <SettingsSection title="Appearance" description="Customize your application theme">
        <label className="hue-picker-label">Theme color</label>
        <div className="hue-placeholder-container">
          <ColorPreviewSquare onClick={handleOpenHuePopup} color={hexColor} />
          <Textfield onClick={handleOpenHuePopup} value={hexColor} readOnly classNamesObj={{ container: "ml-2-rem" }} />
        </div>
      </SettingsSection>
      <HuePopup hue={currentThemeHue} {...alertProps} onConfirm={handleConfirm} />
    </Page>
  );
};

export default Settings;

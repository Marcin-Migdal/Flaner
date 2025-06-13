import { Alert, AlertOpenState, HueSliderCanvas } from "@marcin-migdal/m-component-library";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import "./styles.scss";

type HuePopupProps = {
  hue: number;
  alertOpen: AlertOpenState;
  onConfirm: (hue: number) => void;
  handleClose: () => void;
};

export const HuePopup = ({ hue, alertOpen, onConfirm, handleClose }: HuePopupProps) => {
  const [selectedHue, setSelectedHue] = useState(hue);
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm(selectedHue);
    handleClose();
  };

  return (
    <Alert
      alertOpen={alertOpen}
      handleClose={handleClose}
      header={t("settings.themeColor")}
      onConfirm={handleConfirm}
      onDecline={handleClose}
      confirmBtnText={t("common.actions.select")}
      declineBtnText={t("common.actions.close")}
      className="hue-popup"
    >
      <HueSliderCanvas hue={selectedHue} onChange={setSelectedHue} />
    </Alert>
  );
};

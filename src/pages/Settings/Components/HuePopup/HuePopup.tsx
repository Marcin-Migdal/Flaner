import { Alert, AlertOpenState, HueSliderCanvas } from "@marcin-migdal/m-component-library";
import { useState } from "react";

import "./styles.scss";

type HuePopupProps = {
  hue: number;
  alertOpen: AlertOpenState;
  onConfirm: (hue: number) => void;
  handleClose: () => void;
};

export const HuePopup = ({ hue, alertOpen, onConfirm, handleClose }: HuePopupProps) => {
  const [selectedHue, setSelectedHue] = useState(hue);

  const handleConfirm = () => {
    onConfirm(selectedHue);
    handleClose();
  };

  return (
    <Alert
      alertOpen={alertOpen}
      handleClose={handleClose}
      header="Select theme color"
      onConfirm={handleConfirm}
      onDecline={handleClose}
      confirmBtnText="Select"
      declineBtnText="Close"
      className="hue-popup"
    >
      <HueSliderCanvas hue={selectedHue} onChange={setSelectedHue} />
    </Alert>
  );
};

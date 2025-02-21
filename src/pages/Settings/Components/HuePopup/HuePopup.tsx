import {
  AlertBody,
  AlertFooter,
  AlertHeader,
  AlertOpenState,
  HueSliderCanvas,
} from "@marcin-migdal/m-component-library";
import { useState } from "react";

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
    <AlertBody alertOpen={alertOpen} onClose={handleClose}>
      <AlertHeader onClose={handleClose} header="Select application main color" />
      <div className="m-alert-content">
        <HueSliderCanvas hue={selectedHue} onChange={setSelectedHue} />
      </div>
      <AlertFooter onConfirm={handleConfirm} confirmBtnText="Select" declineBtnText="Close" onDecline={handleClose} />
    </AlertBody>
  );
};

import { AlertBody, AlertFooter, AlertHandler, AlertHeader, HueSliderCanvas, useAlertOpen } from "@Marcin-Migdal/morti-component-library";
import { forwardRef, useState } from "react";

type HuePopupProps = {
    hue: number;
    onConfirm: (hue: number) => void;
};

const HuePopup = ({ hue, onConfirm }: HuePopupProps, ref) => {
    const { alertOpen, data, handleClose } = useAlertOpen({ ref: ref });
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
            <AlertFooter
                data={data}
                onConfirmBtnClick={handleConfirm}
                confirmBtnText="Select"
                declineBtnText="Close"
                onDeclineBtnClick={handleClose}
            />
        </AlertBody>
    );
};

export type HuePopupForwardRef = (props: HuePopupProps & { ref?: React.ForwardedRef<AlertHandler> }) => ReturnType<typeof HuePopup>;

export default forwardRef(HuePopup) as HuePopupForwardRef;

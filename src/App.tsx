import { ToastConfigType, ToastHandler, ToastsContainer, VariantTypes, defaultToastConfig } from "@Marcin-Migdal/morti-component-library";
import { RouterProvider } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";

import { TranslateFunctionType, setToastHandler } from "@slices/index";
import { useAppDispatch } from "@hooks/redux-hooks";
import router from "@pages/index";

// TODO! Lib fixes/changes
//* - When input does not have the label, but has placeholder, labelType should not be "floating", also when labelType changes to "left", labelWidth should be set to 0 and input width to 100%
//* - Make input size prop small/big
//* - change css logic in Col component from % to flex: 1/2/3/4/5/6/7/8/9/10/11/12, because css property gab does not work
//* - why button variant full has black text color???
//* - add highlight version of colors variables for success filure etc.
//? - publish those changes, then apply them in this project

//* - ... css variables refactor
//* - move the dropdown component used in header to lib
//* - adding different colors like purple to the themes, adding the possibility of modifying the theme colors from outside the library

const translateToastConfig = (toastConfig: ToastConfigType<VariantTypes>, t: TranslateFunctionType): ToastConfigType<VariantTypes> => {
    const _toastConfig = { ...toastConfig };

    for (const key in _toastConfig) {
        _toastConfig[key].title = t(_toastConfig[key].title);
    }

    return _toastConfig;
};

function App() {
    const toastRef = useRef<ToastHandler>(null);

    const { t } = useTranslation("common");

    const dispatch = useAppDispatch();

    useEffect(() => {
        if (toastRef.current) dispatch(setToastHandler(toastRef.current));
    }, []);

    return (
        <>
            <ToastsContainer ref={toastRef} toastConfig={translateToastConfig(defaultToastConfig, t)} />
            <RouterProvider router={router} />
        </>
    );
}

export default App;

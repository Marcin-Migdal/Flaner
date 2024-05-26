import { ToastConfigType, ToastHandler, ToastsContainer, VariantTypes, defaultToastConfig } from "@Marcin-Migdal/morti-component-library";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { RouterProvider } from "react-router-dom";

import { useAppDispatch } from "@hooks/redux-hooks";
import router from "@pages/index";
import { TranslateFunctionType, setToastHandler } from "@slices/index";

// TODO! Finish mobile view for header list

// TODO! Lib fixes/changes
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

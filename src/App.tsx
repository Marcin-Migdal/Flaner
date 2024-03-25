import { ToastConfigType, ToastHandler, ToastsContainer, VariantTypes, defaultToastConfig } from "@Marcin-Migdal/morti-component-library";
import { RouterProvider } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";

import { TranslateFunctionType, setToastHandler } from "@slices/index";
import { useAppDispatch } from "@hooks/redux-hooks";
import router from "@pages/index";

import "./App.css";

//! e2e tests

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

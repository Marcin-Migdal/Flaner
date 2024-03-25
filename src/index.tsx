import { ThemeWrapper } from "@Marcin-Migdal/morti-component-library";
import { Loader } from "./components/Loader/Loader";
import { createRoot } from "react-dom/client";
import React, { Suspense } from "react";
import { Provider } from "react-redux";

// internal imports
import store from "./store";
import App from "./App";

// css files
import "./index.css";

// translation config
import "./i18n";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement as HTMLElement);

root.render(
    //ThemeWrapper wrapper is needed from morti-component-library components styles
    <ThemeWrapper theme="light-blue-theme-dark-mode">
        {/* Suspense wrapper is needed for app to wait for ti18next translations files to load */}
        <Suspense fallback={<Loader />}>
            <Provider store={store}>
                <App />
            </Provider>
        </Suspense>
    </ThemeWrapper>
);

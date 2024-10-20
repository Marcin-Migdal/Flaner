import { ThemeWrapper } from "@Marcin-Migdal/morti-component-library";
import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

// internal imports
import App from "./App";
import store from "./app/store";

// css files
import "./commonAssets/css/helpers.scss";
import "./index.css";

// translation config
import "./i18n";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement as HTMLElement);

root.render(
    //ThemeWrapper wrapper is needed from morti-component-library components styles
    <ThemeWrapper theme="light-blue-theme-dark-mode">
        {/* Suspense wrapper is needed for app to wait for ti18next translations files to load */}
        <Suspense>
            <Provider store={store}>
                <App />
            </Provider>
        </Suspense>
    </ThemeWrapper>
);

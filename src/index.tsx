import { ThemeWrapper } from "@marcin-migdal/m-component-library";
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
  //ThemeWrapper wrapper is needed from m-component-library components styles
  <ThemeWrapper darkMode hue={282}>
    {/* Suspense wrapper is needed for app to wait for ti18next translations files to load */}
    <Suspense>
      <Provider store={store}>
        <App />
      </Provider>
    </Suspense>
  </ThemeWrapper>
);

import { StrictMode, Suspense } from "react";
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense>
      <Provider store={store}>
        <App />
      </Provider>
    </Suspense>
  </StrictMode>
);

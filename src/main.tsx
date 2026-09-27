import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { persistor, store } from "./store/redux/store";
import { AuthProvider } from "@/utils/auth";
import { PageLoader } from "@/components/ui/loader";
import { ThemedToaster } from "@/components/app/ThemedToaster";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      {/* Rehydrating the persisted store is fast but not instant — `null` here blanked
          the screen on every cold load, before any route even mounted. */}
      <PersistGate loading={<PageLoader text="Loading..." />} persistor={persistor}>
        <AuthProvider>
          <App />
          <ThemedToaster />
        </AuthProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>,
);

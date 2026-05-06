import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import App from "./App";

registerSW({
  onRegisteredSW: (swScriptUrl, registration) => {
    console.log('PWA service worker registered:', swScriptUrl, registration);
  },
  onRegisterError: (error) => {
    console.error('PWA service worker registration error:', error);
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

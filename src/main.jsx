import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import PowerTools from "./components/PowerTools.jsx";
import FinanceCenter from "./components/FinanceCenter.jsx";
import "./index.css";
import "./styles/enhanced.css";
import "./styles/enhanced2.css";
import "./styles/enhanced3.css";
import "./styles/enhanced4.css";
import "./styles/enhanced5.css";
import "./styles/enhanced6.css";
import "./styles/ux-enhancements.css";
import "./lib/storage.js";

// Seed the platform Super Admin credentials for local (offline) login.
// In Firebase mode, create this same account in Firebase Authentication.
try {
  const SEED = { email: "negm@nile.com", password: "negm2025" };
  const creds = JSON.parse(localStorage.getItem("nile_local_creds") || "{}");
  if (!creds[SEED.email]) {
    creds[SEED.email] = btoa(SEED.password);
    localStorage.setItem("nile_local_creds", JSON.stringify(creds));
  }
} catch { /* ignore */ }

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Restore saved accent theme + density as early as possible.
try {
  const accent = localStorage.getItem("nx_accent");
  if (accent) document.body.classList.add("accent-" + accent);
  if (localStorage.getItem("nx_density") === "compact") document.body.classList.add("nx-density-compact");
} catch { /* ignore */ }

// Mount Power Tools in its OWN isolated root so it can never affect <App/>.
const ptRoot = document.createElement("div");
ptRoot.id = "powertools-root";
document.body.appendChild(ptRoot);
createRoot(ptRoot).render(
  <StrictMode>
    <PowerTools />
  </StrictMode>
);

// Mount Finance & Reports Center in its OWN isolated root too.
const finRoot = document.createElement("div");
finRoot.id = "finance-root";
document.body.appendChild(finRoot);
createRoot(finRoot).render(
  <StrictMode>
    <FinanceCenter />
  </StrictMode>
);

// PWA: register the service worker so the app is installable & works offline
// on both mobile and desktop.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* offline support optional */ });
  });
}

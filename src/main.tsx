import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config"; // Initialiser i18n
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import { registerServiceWorker } from "@/lib/serviceWorker";
import { initializeMissingTables } from "@/lib/migration";
import { configureOAuth } from "@/lib/oauthConfig";

// Initialiser les tables manquantes au démarrage
initializeMissingTables();

// Configurer OAuth (peut être modifié selon les besoins)
// En production, désactiver le mode simulation et configurer les domaines autorisés
configureOAuth({
  allowAutoCreate: true, // Autoriser la création automatique d'utilisateurs OAuth
  simulationMode: true, // Mode simulation activé (pour développement local)
  // allowedEmailDomains: ['@github.com', '@gmail.com'], // Décommenter pour restreindre les domaines
});

// Enregistrer le Service Worker
if (import.meta.env.PROD) {
  registerServiceWorker().catch((err) => {
    console.warn("Impossible d'enregistrer le Service Worker:", err);
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

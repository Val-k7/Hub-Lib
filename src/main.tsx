import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./hooks/useAuth";
import { PermissionsProvider } from "./contexts/PermissionsContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { registerServiceWorker } from "@/lib/serviceWorker";
import { initializeMissingTables } from "@/lib/migration";
import { configureOAuth } from "@/lib/oauthConfig";
import { logger } from "@/lib/logger";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

initializeMissingTables();

configureOAuth({
  allowAutoCreate: true,
  simulationMode: true,
});

if (import.meta.env.PROD) {
  registerServiceWorker().catch((err) => {
    logger.warn(
      "Impossible d'enregistrer le Service Worker",
      undefined,
      err instanceof Error ? err : new Error(String(err))
    );
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <AuthProvider>
          <PermissionsProvider>
            <App />
          </PermissionsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

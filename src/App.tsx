import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PageLoader } from "@/components/LoadingStates";
import { CreateResourceProvider } from "@/contexts/CreateResourceContext";
import { CreateResourceOverlay } from "@/components/CreateResourceOverlay";
import { TemplateSelectorProvider } from "@/contexts/TemplateSelectorContext";
import { TemplateSelectorOverlay } from "@/components/TemplateSelectorOverlay";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Eager load: Homepage and Auth (needed immediately)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load: Secondary pages (code splitting)
const Browse = lazy(() => import("./pages/Browse"));
const ResourceDetail = lazy(() => import("./pages/ResourceDetail"));
const MyResources = lazy(() => import("./pages/MyResources"));
const CreateResource = lazy(() => import("./pages/CreateResource"));
const EditResource = lazy(() => import("./pages/EditResource"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Profile = lazy(() => import("./pages/Profile"));
const CategoriesTagsPage = lazy(() => import("./pages/CategoriesTagsPage"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const SharedWithMe = lazy(() => import("./pages/SharedWithMe"));
const Groups = lazy(() => import("./pages/Groups"));
const Templates = lazy(() => import("./pages/Templates"));
const ApiSettings = lazy(() => import("./pages/ApiSettings"));
const Collections = lazy(() => import("./pages/Collections"));
const CollectionDetail = lazy(() => import("./pages/CollectionDetail"));
const SuggestionsPage = lazy(() => import("./pages/SuggestionsPage"));
const MigrationPage = lazy(() => import("./pages/MigrationPage"));

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <>
      {/* Scroll progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-border/20 z-50">
        <div 
          className="h-full bg-gradient-primary transition-all duration-300"
          style={{ 
            width: `${Math.min(100, (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100)}%` 
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        <Suspense fallback={<PageLoader message="Chargement de la page..." />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><Index /></PageTransition>} />
            <Route path="/browse" element={<PageTransition><Browse /></PageTransition>} />
            <Route path="/categories-tags" element={<PageTransition><CategoriesTagsPage /></PageTransition>} />
            <Route 
              path="/admin" 
              element={
                <PageTransition>
                  <ProtectedRoute requiredRole="admin">
                    <AdminPanel />
                  </ProtectedRoute>
                </PageTransition>
              } 
            />
            <Route path="/resource/:id" element={<PageTransition><ResourceDetail /></PageTransition>} />
            <Route path="/resource/:id/edit" element={<PageTransition><EditResource /></PageTransition>} />
            <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
            <Route path="/my-resources" element={<PageTransition><MyResources /></PageTransition>} />
            <Route path="/create-resource" element={<PageTransition><CreateResource /></PageTransition>} />
            <Route path="/profile/:username" element={<PageTransition><Profile /></PageTransition>} />
            <Route path="/profile/:username/edit" element={<PageTransition><EditProfile /></PageTransition>} />
            <Route path="/shared-with-me" element={<PageTransition><SharedWithMe /></PageTransition>} />
            <Route path="/groups" element={<PageTransition><Groups /></PageTransition>} />
            <Route path="/templates" element={<PageTransition><Templates /></PageTransition>} />
            <Route path="/collections" element={<PageTransition><Collections /></PageTransition>} />
            <Route path="/collection/:id" element={<PageTransition><CollectionDetail /></PageTransition>} />
            <Route path="/api-settings" element={<PageTransition><ApiSettings /></PageTransition>} />
            <Route path="/suggestions" element={<PageTransition><SuggestionsPage /></PageTransition>} />
            <Route path="/migration" element={<PageTransition><MigrationPage /></PageTransition>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </>
  );
};

const App = () => (
  <TooltipProvider>
    <CreateResourceProvider>
      <TemplateSelectorProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatedRoutes />
          <ScrollToTop />
          <CreateResourceOverlay />
          <TemplateSelectorOverlay />
        </BrowserRouter>
      </TemplateSelectorProvider>
    </CreateResourceProvider>
  </TooltipProvider>
);

export default App;

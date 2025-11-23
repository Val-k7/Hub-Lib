import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Github, LogOut, FileText, Plus, Menu, Shield, Share2, Users, Bell, Compass, Folder, Upload, GitBranch, Sparkles, Lightbulb } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

export const Header = () => {
  const { t } = useTranslation();
  const { user, signOut, signInWithGitHub } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
    navigate("/");
  };

  const handleGitHubSignIn = async () => {
    setLoading(true);
    await signInWithGitHub();
  };

  const handleSectionClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handleNavigate = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-lg transition-all duration-300"
      role="banner"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-2 hover:opacity-80 transition-all hover-scale"
            aria-label="HubLib - Retour à l'accueil"
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-primary" aria-hidden="true" />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              HubLib
            </span>
          </Link>
          
          <nav 
            className="hidden md:flex items-center gap-4"
            role="navigation"
            aria-label="Navigation principale"
          >
            {/* Explorer */}
            <Link 
              to="/browse" 
              className="relative text-sm font-medium text-foreground/80 hover:text-foreground transition-colors group flex items-center gap-1.5"
              aria-current={location.pathname === '/browse' ? 'page' : undefined}
            >
              <Compass className="h-4 w-4" />
              {t('nav.explore')}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" aria-hidden="true" />
            </Link>

            {user && (
              <>
                {/* Ressources - Sous-menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="relative text-sm font-medium text-foreground/80 hover:text-foreground transition-colors group flex items-center gap-1.5 outline-none data-[state=open]:text-foreground">
                    <Folder className="h-4 w-4" />
                    {t('nav.resources')}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full group-data-[state=open]:w-full" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem onClick={() => navigate("/my-resources")}>
                      <FileText className="mr-2 h-4 w-4" />
                      {t('nav.myResources')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/collections")}>
                      <Folder className="mr-2 h-4 w-4" />
                      {t('nav.collections')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/shared-with-me")}>
                      <Share2 className="mr-2 h-4 w-4" />
                      {t('nav.sharedWithMe')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Espaces */}
                <Link 
                  to="/groups" 
                  className="relative text-sm font-medium text-foreground/80 hover:text-foreground transition-colors group flex items-center gap-1.5"
                  aria-current={location.pathname === '/groups' ? 'page' : undefined}
                >
                  <Users className="h-4 w-4" />
                  {t('nav.spaces')}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" aria-hidden="true" />
                </Link>
              </>
            )}

            {/* Créer - Bouton primaire avec dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="default" 
                    size="sm"
                    className="gap-1.5 shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    {t('nav.create')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => navigate("/create-resource")}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('nav.createResource')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/templates")}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t('nav.useTemplate')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    navigate("/create-resource?type=github");
                  }}>
                    <GitBranch className="mr-2 h-4 w-4" />
                    {t('nav.importGitHub')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    navigate("/create-resource?type=upload");
                  }}>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('nav.uploadFile')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Suggérer - Bouton pour rediriger vers la page de suggestions */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                if (!user) {
                  navigate("/auth");
                  return;
                }
                navigate("/suggestions");
              }}
            >
              <Lightbulb className="h-4 w-4" />
              Suggérer
            </Button>
          </nav>

          <div className="flex items-center gap-2">
            {user && (
              <Button
                variant="ghost"
                size="sm"
                className="relative"
                onClick={() => navigate("/notifications")}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} non lues` : ''}`}
                aria-live="polite"
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    aria-label={`${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`}
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            )}
            {/* Mobile Menu */}
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-background z-[100]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-primary" />
                      <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                        HubLib
                      </span>
                    </SheetTitle>
                  </SheetHeader>
                  
                  <nav className="flex flex-col gap-4 mt-8">
                    <button
                      onClick={() => handleNavigate("/")}
                      className="text-base font-medium text-foreground/80 hover:text-foreground transition-colors py-2 hover:bg-muted/50 px-4 rounded-lg text-left"
                    >
                      {t('nav.home')}
                    </button>

                    {/* Explorer */}
                    <button
                      onClick={() => handleNavigate("/browse")}
                      className="text-base font-medium text-foreground/80 hover:text-foreground transition-colors py-2 hover:bg-muted/50 px-4 rounded-lg text-left flex items-center gap-2"
                    >
                      <Compass className="h-4 w-4" />
                      {t('nav.explore')}
                    </button>
                    
                    {user && (
                      <>
                        {/* Ressources */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4">
                            {t('nav.resources')}
                          </p>
                          <button
                            onClick={() => handleNavigate("/my-resources")}
                            className="w-full text-left flex items-center gap-2 text-base font-medium text-foreground/80 hover:text-foreground transition-colors py-2 hover:bg-muted/50 px-4 rounded-lg"
                          >
                            <FileText className="h-4 w-4" />
                            {t('nav.myResources')}
                          </button>
                          <button
                            onClick={() => handleNavigate("/collections")}
                            className="w-full text-left flex items-center gap-2 text-base font-medium text-foreground/80 hover:text-foreground transition-colors py-2 hover:bg-muted/50 px-4 rounded-lg"
                          >
                            <Folder className="h-4 w-4" />
                            {t('nav.collections')}
                          </button>
                          <button
                            onClick={() => handleNavigate("/shared-with-me")}
                            className="w-full text-left flex items-center gap-2 text-base font-medium text-foreground/80 hover:text-foreground transition-colors py-2 hover:bg-muted/50 px-4 rounded-lg"
                          >
                            <Share2 className="h-4 w-4" />
                            {t('nav.sharedWithMe')}
                          </button>
                        </div>

                        {/* Espaces */}
                        <button
                          onClick={() => handleNavigate("/groups")}
                          className="text-base font-medium text-foreground/80 hover:text-foreground transition-colors py-2 hover:bg-muted/50 px-4 rounded-lg text-left flex items-center gap-2"
                        >
                          <Users className="h-4 w-4" />
                          {t('nav.spaces')}
                        </button>
                      </>
                    )}
                    
                    <Separator className="my-4" />
                    
                    {user ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 rounded-lg">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                            <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                              {user.email?.[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user.user_metadata?.full_name || "Utilisateur"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        
                        {/* Créer - Section mobile */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4">
                            {t('nav.create')}
                          </p>
                          <button
                            onClick={() => handleNavigate("/create-resource")}
                            className="w-full text-left flex items-center gap-2 text-base font-medium text-foreground/80 hover:text-foreground transition-colors py-2 hover:bg-muted/50 px-4 rounded-lg"
                          >
                            <Plus className="h-4 w-4" />
                            {t('nav.createResource')}
                          </button>
                          <button
                            onClick={() => handleNavigate("/templates")}
                            className="w-full text-left flex items-center gap-2 text-base font-medium text-foreground/80 hover:text-foreground transition-colors py-2 hover:bg-muted/50 px-4 rounded-lg"
                          >
                            <Sparkles className="h-4 w-4" />
                            {t('nav.useTemplate')}
                          </button>
                          <button
                            onClick={() => handleNavigate("/create-resource?type=github")}
                            className="w-full text-left flex items-center gap-2 text-base font-medium text-foreground/80 hover:text-foreground transition-colors py-2 hover:bg-muted/50 px-4 rounded-lg"
                          >
                            <GitBranch className="h-4 w-4" />
                            {t('nav.importGitHub')}
                          </button>
                          <button
                            onClick={() => handleNavigate("/create-resource?type=upload")}
                            className="w-full text-left flex items-center gap-2 text-base font-medium text-foreground/80 hover:text-foreground transition-colors py-2 hover:bg-muted/50 px-4 rounded-lg"
                          >
                            <Upload className="h-4 w-4" />
                            {t('nav.uploadFile')}
                          </button>
                        </div>

                        {/* Suggérer - Section mobile */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4">
                            Suggestions
                          </p>
                          <button
                            onClick={() => {
                              setMobileMenuOpen(false);
                              if (!user) {
                                navigate("/auth");
                                return;
                              }
                              navigate("/suggestions");
                            }}
                            className="w-full text-left flex items-center gap-2 text-base font-medium text-foreground/80 hover:text-foreground transition-colors py-2 hover:bg-muted/50 px-4 rounded-lg"
                          >
                            <Lightbulb className="h-4 w-4" />
                            Suggérer
                          </button>
                        </div>
                        
                        <Separator />
                        
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left flex items-center gap-3 text-base font-medium text-destructive hover:text-destructive/80 transition-colors py-2 hover:bg-muted/50 px-4 rounded-lg"
                        >
                          <LogOut className="h-5 w-5" />
                          {t('nav.signOut')}
                        </button>
                      </div>
                    ) : (
                      <Button 
                        variant="hero" 
                        className="gap-2 w-full"
                        onClick={handleGitHubSignIn}
                        disabled={loading}
                      >
                        <Github className="h-4 w-4" />
                        {loading ? t('common.loading') : t('auth.signInWithGitHub')}
                      </Button>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>

            <LanguageToggle />
            <ThemeToggle />
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden md:flex relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                        {user.email?.[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-background z-[100]" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.user_metadata?.full_name || "Utilisateur"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/my-resources")}>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>{t('nav.myResources')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/create-resource")}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>{t('resources.create')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>{t('nav.admin')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/api-settings")}>
                    <Github className="mr-2 h-4 w-4" />
                    <span>Paramètres API</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('nav.signOut')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="hero" 
                size="sm" 
                className="hidden md:flex gap-2 hover-scale shadow-glow"
                onClick={handleGitHubSignIn}
                disabled={loading}
              >
                <Github className="h-4 w-4" />
                {loading ? "Connexion..." : "Connecter GitHub"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

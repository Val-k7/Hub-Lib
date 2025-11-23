import { Button } from "@/components/ui/button";
import { Library, Sparkles, ArrowRight, Star, Users, LockKeyhole, Share2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useState } from "react";

export const Hero = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (user) {
      navigate("/browse");
    } else {
      navigate("/auth");
    }
  };

  // Version simplifiée pour les utilisateurs connectés
  if (user) {
    return (
      <section className="relative py-24 flex items-center justify-center overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-hero opacity-30" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
            {/* Main heading */}
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              <span className="block mb-2">Bienvenue sur</span>
              <span className="block bg-gradient-primary bg-clip-text text-transparent">
                HubLib
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Découvrez et partagez des ressources avec la communauté
            </p>

            {/* Quick actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Link to="/browse">
                <Button 
                  size="lg" 
                  className="gap-2 shadow-glow hover-scale text-lg px-8 py-6"
                >
                  <Library className="h-5 w-5" />
                  Explorer
                  <ArrowRight className="h-5 w-5 ml-1" />
                </Button>
              </Link>
              <Link to="/create-resource">
                <Button variant="outline" size="lg" className="gap-2 hover-scale text-lg px-8 py-6 border-2">
                  <Share2 className="h-5 w-5" />
                  Créer une ressource
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </section>
    );
  }

  // Version complète pour les utilisateurs non connectés
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-hero opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_50%)] animate-pulse" />
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="container mx-auto px-4 py-32 relative z-10">
        <div className="max-w-5xl mx-auto text-center space-y-8 animate-fade-in">
          {/* Badge with animation */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm hover:scale-105 transition-transform">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">{t('hero.badge')}</span>
          </div>

          {/* Main heading with gradient animation */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight">
            <span className="block mb-2 animate-fade-in">{t('hero.title1')}</span>
            <span className="block bg-gradient-primary bg-clip-text text-transparent animate-fade-in" style={{ animationDelay: '0.2s' }}>
              {t('hero.title2')}
            </span>
          </h1>

          {/* Description with fade in */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {t('hero.description')}
          </p>

          {/* CTA Buttons with staggered animation */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <Button 
              size="lg" 
              className="gap-2 shadow-glow hover-scale text-lg px-8 py-6"
              onClick={handleGetStarted}
            >
              <Share2 className="h-5 w-5" />
              {t('hero.getStarted')}
              <ArrowRight className="h-5 w-5 ml-1" />
            </Button>
            <Link to="/browse">
              <Button variant="outline" size="lg" className="gap-2 hover-scale text-lg px-8 py-6 border-2">
                <Library className="h-5 w-5" />
                {t('hero.browseResources')}
              </Button>
            </Link>
          </div>

          {/* Enhanced Stats with icons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-16 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.8s' }}>
            <div className="group space-y-2 p-6 rounded-2xl hover:bg-card/50 transition-all hover-scale">
              <div className="flex items-center justify-center gap-2">
                <Library className="h-6 w-6 text-primary" />
                <div className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">1K+</div>
              </div>
              <div className="text-sm text-muted-foreground font-medium">{t('hero.stats.resources')}</div>
            </div>
            <div className="group space-y-2 p-6 rounded-2xl hover:bg-card/50 transition-all hover-scale">
              <div className="flex items-center justify-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                <div className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">500+</div>
              </div>
              <div className="text-sm text-muted-foreground font-medium">{t('hero.stats.developers')}</div>
            </div>
            <div className="group space-y-2 p-6 rounded-2xl hover:bg-card/50 transition-all hover-scale">
              <div className="flex items-center justify-center gap-2">
                <Star className="h-6 w-6 text-primary" />
                <div className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">50+</div>
              </div>
              <div className="text-sm text-muted-foreground font-medium">{t('hero.stats.categories')}</div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-8 pt-8 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '1s' }}>
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              <span>{t('hero.trust.easyShare')}</span>
            </div>
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-4 w-4" />
              <span>{t('hero.trust.secure')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>{t('hero.trust.free')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </section>
  );
};

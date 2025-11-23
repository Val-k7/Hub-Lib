import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Check, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

export const CTA = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (user) {
      navigate("/my-resources");
    } else {
      navigate("/auth");
    }
  };

  return (
    <section className="py-32 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-primary opacity-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15),transparent_70%)] animate-pulse" />
      
      {/* Floating orbs */}
      <div className="absolute top-10 left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-20 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-12 md:p-16 shadow-2xl animate-fade-in">
            <div className="text-center space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm font-medium text-primary">Rejoignez la Communauté</span>
              </div>

              <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
                Prêt à{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Commencer
                </span>
                {" "}?
              </h2>
              
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Rejoignez des milliers d'utilisateurs qui centralisent et partagent leurs ressources. 
                Créez votre compte pour démarrer en quelques secondes.
              </p>

              {/* Benefits */}
              <div className="grid md:grid-cols-3 gap-6 pt-8">
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-muted-foreground">100% Gratuit</span>
                </div>
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-muted-foreground">Sans Engagement</span>
                </div>
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-muted-foreground">Open Source</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                <Button 
                  size="lg" 
                  className="gap-2 shadow-glow hover-scale text-lg px-10 py-6"
                  onClick={handleGetStarted}
                >
                  <Share2 className="h-5 w-5" />
                  {user ? "Mes Ressources" : "Créer un Compte"}
                  <ArrowRight className="h-5 w-5 ml-1" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="gap-2 hover-scale text-lg px-10 py-6 border-2"
                  onClick={() => navigate("/browse")}
                >
                  Parcourir les Ressources
                </Button>
              </div>

              {/* Trust indicators with pulse animation */}
              <div className="pt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span>Gratuit pour toujours</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.3s' }} />
                  <span>Code Open Source</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" style={{ animationDelay: '0.6s' }} />
                  <span>Accessible à Tous</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

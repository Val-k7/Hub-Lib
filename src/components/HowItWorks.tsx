import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  GitFork, 
  Upload, 
  Search, 
  Download,
  Check,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: GitFork,
    title: "Connectez GitHub",
    description: "Liez votre compte GitHub en un clic pour synchroniser vos repos",
    details: "Authentification OAuth sécurisée. Vos repos restent privés sauf si vous les partagez.",
    color: "from-blue-500 to-cyan-500",
    demo: "git clone github.com/user/repo"
  },
  {
    icon: Upload,
    title: "Publiez vos Ressources",
    description: "Ajoutez des tags, catégories et descriptions pour organiser",
    details: "Snippets, configs, docs, templates - tout contenu textuel ou structuré.",
    color: "from-purple-500 to-pink-500",
    demo: "tags: #react #hooks #typescript"
  },
  {
    icon: Search,
    title: "Découvrez la Communauté",
    description: "Explorez des milliers de ressources partagées par la communauté",
    details: "Recherche avancée par tags, catégories, langages et métadonnées.",
    color: "from-orange-500 to-red-500",
    demo: "search: react hooks custom auth"
  },
  {
    icon: Download,
    title: "Réutilisez & Contribuez",
    description: "Fork, téléchargez, améliorez et partagez vos modifications",
    details: "Système de versioning complet. Suivez l'évolution et les contributions.",
    color: "from-green-500 to-emerald-500",
    demo: "git fork → modify → push → share"
  }
];

export const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState(0);
  const ActiveIcon = steps[activeStep].icon;

  return (
    <section id="how-it-works" className="py-32 relative overflow-hidden bg-gradient-subtle">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.08),transparent_50%)]" />
      <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-20 space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 backdrop-blur-sm mb-4">
            <Check className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-accent">Simple & Rapide</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Comment ça <span className="bg-gradient-primary bg-clip-text text-transparent">fonctionne</span> ?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            4 étapes simples pour commencer à partager et découvrir des ressources
          </p>
        </div>

        {/* Interactive Steps */}
        <div className="max-w-6xl mx-auto">
          {/* Step Navigation */}
          <div className="grid md:grid-cols-4 gap-4 mb-12">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <button
                  key={index}
                  onClick={() => setActiveStep(index)}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 text-left ${
                    activeStep === index
                      ? 'border-primary bg-primary/5 shadow-elegant scale-105'
                      : 'border-border/50 bg-card/50 hover:border-primary/50 hover:bg-card/80'
                  }`}
                >
                  <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 ${
                    activeStep === index ? 'scale-110' : ''
                  } transition-transform`}>
                    <StepIcon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="space-y-1">
                    <Badge variant="secondary" className="mb-2">Étape {index + 1}</Badge>
                    <h3 className="font-semibold text-sm">{step.title}</h3>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Step Details */}
          <Card className="p-8 md:p-12 bg-card/80 backdrop-blur-sm border-border/50 shadow-elegant animate-fade-in">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div>
                  <div className={`inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br ${steps[activeStep].color} items-center justify-center mb-6 shadow-lg`}>
                    <ActiveIcon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <Badge variant="outline" className="mb-3">Étape {activeStep + 1} / 4</Badge>
                  <h3 className="text-3xl font-bold mb-4">{steps[activeStep].title}</h3>
                  <p className="text-xl text-muted-foreground mb-4">
                    {steps[activeStep].description}
                  </p>
                  <p className="text-foreground/80 leading-relaxed">
                    {steps[activeStep].details}
                  </p>
                </div>

                <div className="flex gap-3">
                  {activeStep > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveStep(activeStep - 1)}
                    >
                      Précédent
                    </Button>
                  )}
                  {activeStep < steps.length - 1 ? (
                    <Button 
                      onClick={() => setActiveStep(activeStep + 1)}
                      className="gap-2"
                    >
                      Suivant
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Link to="/auth">
                      <Button className="gap-2">
                        Commencer maintenant
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Demo/Visual */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur-2xl" />
                <Card className="relative p-8 bg-card/90 border-primary/20 backdrop-blur-sm">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="flex gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <div className="h-3 w-3 rounded-full bg-yellow-500" />
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                      </div>
                      <span className="text-xs text-gray-400 ml-auto">terminal</span>
                    </div>
                    <div className="font-mono text-sm">
                      <div className="text-green-400 mb-2">$ hublib</div>
                      <div className="text-gray-400 mb-4 animate-pulse">{'>'} {steps[activeStep].demo}</div>
                      <div className="text-blue-400">✓ Success!</div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center gap-2 mt-12">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveStep(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                activeStep === index ? 'w-12 bg-primary' : 'w-2 bg-border hover:bg-primary/50'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

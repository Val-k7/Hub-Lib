import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Lock, Search, Users, Zap, Tags } from "lucide-react";

const features = [
  {
    icon: GitBranch,
    title: "Propulsé par Git",
    description: "Versionning, collaboration et stockage décentralisé via GitHub.",
    stats: "10k+ repos connectés",
    example: "git clone → auto-sync",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: Tags,
    title: "Tags Intelligents",
    description: "Système de tags et catégories avancé pour une organisation parfaite.",
    stats: "50+ catégories",
    example: "#react #hooks #auth",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: Search,
    title: "Recherche Puissante",
    description: "Recherche instantanée par mots-clés, tags, catégories et métadonnées.",
    stats: "< 100ms de latence",
    example: "search: react custom hooks",
    color: "from-orange-500 to-red-500"
  },
  {
    icon: Users,
    title: "Communauté Active",
    description: "Découvrez et contribuez à une bibliothèque grandissante.",
    stats: "5k+ développeurs",
    example: "fork → improve → share",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: Lock,
    title: "Contrôle Total",
    description: "Choisissez ce que vous partagez. Repos privés ou publics.",
    stats: "100% sécurisé",
    example: "private by default",
    color: "from-red-500 to-pink-500"
  },
  {
    icon: Zap,
    title: "Données Légères",
    description: "Texte, JSON, Markdown, snippets - tout contenu structuré.",
    stats: "Illimité",
    example: "< 10MB par ressource",
    color: "from-yellow-500 to-orange-500"
  },
];

export const Features = () => {
  return (
    <section id="features" className="py-32 bg-gradient-subtle relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05),transparent_50%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-20 space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-4">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Conçu pour les Développeurs</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Une plateforme <span className="bg-gradient-primary bg-clip-text text-transparent">complète</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Tout ce dont vous avez besoin pour partager, découvrir et réutiliser des ressources de développement
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className="group p-8 hover:shadow-elegant transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:-translate-y-2 animate-fade-in relative overflow-hidden"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              
              <div className="space-y-4 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="relative">
                    <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                      <feature.icon className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-background dark:bg-primary rounded-full animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <Badge variant="secondary" className="group-hover:scale-105 transition-transform">
                    {feature.stats}
                  </Badge>
                </div>
                
                <div>
                  <h3 className="text-2xl font-semibold group-hover:text-primary transition-colors mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    {feature.description}
                  </p>
                  
                  {/* Code example */}
                  <div className="bg-muted/50 dark:bg-muted/20 rounded-lg p-3 border border-border/50">
                    <code className="text-xs text-accent font-mono">
                      {feature.example}
                    </code>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

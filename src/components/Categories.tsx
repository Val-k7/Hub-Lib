import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  Link as LinkIcon, 
  Image, 
  FileCode, 
  Code2, 
  GraduationCap, 
  Wrench, 
  Database,
  ArrowRight
} from "lucide-react";

const categories = [
  {
    icon: FileText,
    title: "Documents & Fichiers",
    count: 420,
    color: "bg-blue-500/10 text-blue-500",
    items: ["PDFs", "Word", "Excel", "PowerPoint"],
  },
  {
    icon: LinkIcon,
    title: "Liens & Favoris",
    count: 380,
    color: "bg-green-500/10 text-green-500",
    items: ["Sites web", "Articles", "Ressources", "Outils"],
  },
  {
    icon: Image,
    title: "Médias & Images",
    count: 290,
    color: "bg-purple-500/10 text-purple-500",
    items: ["Photos", "Vidéos", "Audio", "Graphiques"],
  },
  {
    icon: FileCode,
    title: "Templates & Modèles",
    count: 245,
    color: "bg-cyan-500/10 text-cyan-500",
    items: ["Documents", "Emails", "Présentations", "Formulaires"],
  },
  {
    icon: Code2,
    title: "Code & Scripts",
    count: 320,
    color: "bg-orange-500/10 text-orange-500",
    items: ["Snippets", "Scripts", "Config", "Automation"],
  },
  {
    icon: GraduationCap,
    title: "Formations & Tutoriels",
    count: 215,
    color: "bg-pink-500/10 text-pink-500",
    items: ["Cours", "Guides", "Documentation", "FAQ"],
  },
  {
    icon: Wrench,
    title: "Outils & Utilitaires",
    count: 185,
    color: "bg-yellow-500/10 text-yellow-500",
    items: ["Calculateurs", "Générateurs", "Convertisseurs", "Plugins"],
  },
  {
    icon: Database,
    title: "Données & Références",
    count: 165,
    color: "bg-indigo-500/10 text-indigo-500",
    items: ["Datasets", "Listes", "Archives", "Références"],
  },
];

export const Categories = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (categoryTitle: string) => {
    // Navigate to browse page with category filter
    navigate(`/browse?category=${encodeURIComponent(categoryTitle)}`);
  };

  const handleTagClick = (tag: string) => {
    // Navigate to browse page with tag search
    navigate(`/browse?search=${encodeURIComponent(tag)}`);
  };

  return (
    <section id="categories" className="py-32 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.05),transparent_50%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-20 space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 backdrop-blur-sm mb-4">
            <Database className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-accent">8 Catégories Principales</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Explorer par <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">Catégories</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Des documents aux médias en passant par les liens - organisez et partagez toutes vos ressources
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-20">
          {categories.map((category, index) => (
            <Card
              key={category.title}
              onClick={() => handleCategoryClick(category.title)}
              className="group p-6 hover:shadow-elegant transition-all duration-300 cursor-pointer border-border/50 bg-card/80 backdrop-blur-sm hover:-translate-y-2 animate-fade-in relative overflow-hidden"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className={`h-14 w-14 rounded-xl ${category.color} flex items-center justify-center group-hover:scale-110 transition-transform relative`}>
                    <category.icon className="h-7 w-7" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <Badge variant="secondary" className="group-hover:scale-110 transition-transform">
                    {category.count}
                  </Badge>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                    {category.title}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {category.items.map((item) => (
                      <span
                        key={item}
                        className="text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md hover:bg-muted transition-colors"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Enhanced Tag Examples */}
        <div className="max-w-5xl mx-auto animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-3">Recherche par Tags</h3>
            <p className="text-lg text-muted-foreground">Tags populaires pour affiner vos recherches</p>
          </div>
          
          <div className="flex flex-wrap gap-2.5 justify-center">
            {[
              "pdf", "tutorial", "template", "design", "video", "tools",
              "markdown", "presentation", "guide", "dataset", "reference", "image",
              "formation", "documentation", "checklist", "workflow", "calculator", "archive"
            ].map((tag, index) => (
              <Badge 
                key={tag} 
                onClick={() => handleTagClick(tag)}
                variant="outline" 
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all animate-fade-in px-4 py-2 text-sm"
                style={{ animationDelay: `${0.6 + index * 0.02}s` }}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

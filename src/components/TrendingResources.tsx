import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Star, 
  Download, 
  Eye,
  GitFork,
  Clock,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

// Mock trending resources data
const trendingResources = [
  {
    id: "1",
    title: "React Custom Hooks Collection",
    description: "Collection complète de hooks React réutilisables pour l'authentification, les formulaires, et plus encore",
    category: "Code & Snippets",
    tags: ["react", "hooks", "typescript"],
    language: "TypeScript",
    stars: 1247,
    downloads: 3842,
    views: 8921,
    trend: "+284%",
    author: "johndoe",
    time: "2h ago"
  },
  {
    id: "2",
    title: "Docker Compose Templates",
    description: "Templates Docker Compose prêts à l'emploi pour NGINX, PostgreSQL, Redis, MongoDB et autres",
    category: "Configurations",
    tags: ["docker", "devops", "yaml"],
    language: "YAML",
    stars: 892,
    downloads: 2156,
    views: 5432,
    trend: "+156%",
    author: "devmaster",
    time: "5h ago"
  },
  {
    id: "3",
    title: "REST API Documentation Template",
    description: "Template Markdown professionnel pour documenter vos APIs REST avec exemples et best practices",
    category: "Documents & Notes",
    tags: ["api", "documentation", "markdown"],
    language: "Markdown",
    stars: 654,
    downloads: 1823,
    views: 4215,
    trend: "+98%",
    author: "apiexpert",
    time: "1d ago"
  }
];

export const TrendingResources = () => {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.05),transparent_50%)]" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-20 space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-sm mb-4">
            <TrendingUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">En Tendance</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Ressources <span className="bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">Populaires</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Les ressources les plus téléchargées et appréciées cette semaine
          </p>
        </div>

        <div className="max-w-6xl mx-auto space-y-6 mb-12">
          {trendingResources.map((resource, index) => (
            <Card
              key={resource.id}
              className="group p-8 hover:shadow-elegant transition-all duration-300 border-border/50 bg-card/80 backdrop-blur-sm hover:-translate-y-1 animate-fade-in cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left: Main content */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="secondary">{resource.category}</Badge>
                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-primary-foreground border-0">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {resource.trend}
                        </Badge>
                      </div>
                      <h3 className="text-2xl font-bold group-hover:text-primary transition-colors mb-2">
                        {resource.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {resource.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{resource.stars.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Download className="h-4 w-4" />
                      <span>{resource.downloads.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      <span>{resource.views.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{resource.time}</span>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <div className="flex items-center gap-1.5">
                      <GitFork className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">@{resource.author}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {resource.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                    <Badge variant="secondary" className="text-xs">
                      {resource.language}
                    </Badge>
                  </div>
                </div>

                {/* Right: Action */}
                <div className="flex items-center">
                  <Link to={`/resource/${resource.id}`}>
                    <Button 
                      variant="outline" 
                      className="gap-2 group-hover:border-primary group-hover:text-primary transition-colors"
                    >
                      Voir détails
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* View all button */}
        <div className="text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <Link to="/browse">
            <Button size="lg" className="gap-2 hover-scale">
              Voir toutes les ressources
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

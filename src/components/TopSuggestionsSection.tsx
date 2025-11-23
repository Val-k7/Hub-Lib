import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp,
  FolderTree,
  Tag,
  FileText,
  Filter,
  ThumbsUp,
  ArrowRight,
  Sparkles,
  Plus,
  Minus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAllTopSuggestions } from "@/hooks/useTopSuggestions";
import { useMemo } from "react";

type SuggestionType = "category" | "tag" | "resource_type" | "filter";

const getTypeConfig = (type: SuggestionType) => {
  switch (type) {
    case "category":
      return {
        label: "Catégories",
        icon: FolderTree,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-500/10 border-blue-500/20",
      };
    case "tag":
      return {
        label: "Tags",
        icon: Tag,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-500/10 border-green-500/20",
      };
    case "resource_type":
      return {
        label: "Types",
        icon: FileText,
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-500/10 border-purple-500/20",
      };
    case "filter":
      return {
        label: "Filtres",
        icon: Filter,
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-500/10 border-orange-500/20",
      };
  }
};

export const TopSuggestionsSection = () => {
  const { categories, tags, resourceTypes, filters } = useAllTopSuggestions(8);

  const sections = useMemo(() => {
    return [
      {
        type: "category" as SuggestionType,
        data: categories.data || [],
        isLoading: categories.isLoading,
      },
      {
        type: "tag" as SuggestionType,
        data: tags.data || [],
        isLoading: tags.isLoading,
      },
      {
        type: "resource_type" as SuggestionType,
        data: resourceTypes.data || [],
        isLoading: resourceTypes.isLoading,
      },
      {
        type: "filter" as SuggestionType,
        data: filters.data || [],
        isLoading: filters.isLoading,
      },
    ];
  }, [categories, tags, resourceTypes, filters]);

  const isLoading = sections.some((section) => section.isLoading);
  const hasAnySuggestions = sections.some((section) => section.data.length > 0);

  if (!isLoading && !hasAnySuggestions) {
    return null;
  }

  return (
    <section className="py-32 relative overflow-hidden bg-gradient-subtle">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.05),transparent_50%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="animate-fade-in">
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Suggestions</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Top <span className="bg-gradient-primary bg-clip-text text-transparent">Suggestions</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Les suggestions les plus populaires de la communauté en attente d'approbation
            </p>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="h-6 bg-muted rounded w-1/4 mb-4" />
                  <div className="flex gap-2 overflow-hidden">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <div key={j} className="h-20 w-32 bg-muted rounded flex-shrink-0" />
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {sections.map((section) => {
                if (section.data.length === 0) return null;

                const config = getTypeConfig(section.type);
                const Icon = config.icon;

                return (
                  <Card
                    key={section.type}
                    className="p-6 border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg transition-all"
                  >
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${config.bgColor}`}>
                            <Icon className={`h-5 w-5 ${config.color}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{config.label}</h3>
                            <p className="text-xs text-muted-foreground">
                              {section.data.length} suggestion{section.data.length > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <Link to="/suggestions">
                          <Button variant="ghost" size="sm" className="gap-2">
                            Voir tout
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>

                      {/* Suggestions list - horizontal scroll */}
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {section.data.map((suggestion) => (
                          <Card
                            key={suggestion.id}
                            className="flex-shrink-0 p-3 min-w-[160px] hover:shadow-md transition-shadow border-border/50 cursor-pointer group"
                            onClick={() => window.location.href = "/suggestions"}
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                                  {suggestion.name}
                                </h4>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  <ThumbsUp className="h-3 w-3" />
                                  {suggestion.votes_count}
                                </Badge>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {!isLoading && hasAnySuggestions && (
            <div className="text-center mt-8">
              <Link to="/suggestions">
                <Button size="lg" variant="outline" className="gap-2 hover-scale">
                  Voir toutes les suggestions
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};


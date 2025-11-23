import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Star, FileType, TrendingUp } from "lucide-react";

interface Resource {
  category: string;
  resource_type: string;
  average_rating: number | null;
}

interface BrowseStatsProps {
  resources: Resource[];
}

export const BrowseStats = ({ resources }: BrowseStatsProps) => {
  const stats = useMemo(() => {
    // Ressources par catégorie
    const byCategory = resources.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Ressources par type
    const byType = resources.reduce((acc, r) => {
      acc[r.resource_type] = (acc[r.resource_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Note moyenne globale
    const ratingsSum = resources.reduce((sum, r) => sum + (r.average_rating || 0), 0);
    const avgRating = resources.length > 0 ? (ratingsSum / resources.length).toFixed(1) : "0.0";

    // Top 3 catégories
    const topCategories = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    // Top 3 types
    const topTypes = Object.entries(byType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    return {
      totalResources: resources.length,
      avgRating,
      topCategories,
      topTypes,
      byCategory,
      byType,
    };
  }, [resources]);

  const typeLabels: Record<string, string> = {
    file_upload: "Fichier",
    external_link: "Lien externe",
    github_repo: "Dépôt GitHub",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total ressources */}
      <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover-scale animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ressources totales</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalResources}</p>
          </div>
        </div>
      </Card>

      {/* Note moyenne */}
      <Card className="p-4 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 hover-scale animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/20 rounded-lg">
            <Star className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Note moyenne</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-foreground">{stats.avgRating}</p>
              <Star className="h-4 w-4 fill-accent text-accent" />
            </div>
          </div>
        </div>
      </Card>

      {/* Top catégories */}
      <Card className="p-4 bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20 hover-scale animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-secondary/20 rounded-lg">
            <TrendingUp className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground mb-2">Top Catégories</p>
            <div className="space-y-1">
              {stats.topCategories.map(([category, count]) => (
                <div key={category} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-foreground truncate">{category}</span>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Top types */}
      <Card className="p-4 bg-gradient-to-br from-muted/50 to-muted/20 border-border/50 hover-scale animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <FileType className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground mb-2">Types populaires</p>
            <div className="space-y-1">
              {stats.topTypes.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-foreground truncate">{typeLabels[type] || type}</span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

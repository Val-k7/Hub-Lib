import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Clock,
  FolderOpen,
  ArrowRight,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { usePopularResources, useRecentResources, usePublicCollections } from "@/hooks/useHomeRecommendations";
import { ResourceCard } from "./ResourceCard";
import { CollectionCard } from "./CollectionCard";
import { ResourceGridSkeleton } from "./LoadingStates";
import { NoResources } from "./EmptyStates";

export const HomeRecommendations = () => {
  const navigate = useNavigate();
  const { data: popularResources = [], isLoading: loadingPopular } = usePopularResources(6);
  const { data: recentResources = [], isLoading: loadingRecent } = useRecentResources(6);
  const { data: publicCollections = [], isLoading: loadingCollections } = usePublicCollections(6);

  return (
    <section className="py-32 relative overflow-hidden bg-gradient-subtle">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05),transparent_50%)]" />
      
      <div className="container mx-auto px-4 relative z-10 space-y-24">
        {/* Ressources populaires */}
        <div className="animate-fade-in">
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Recommandé</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Ressources <span className="bg-gradient-primary bg-clip-text text-transparent">Populaires</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Les ressources les plus consultées, téléchargées et appréciées par la communauté
            </p>
          </div>

          {loadingPopular ? (
            <ResourceGridSkeleton count={6} />
          ) : popularResources.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {popularResources.map((resource, index) => (
                  <div
                    key={resource.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${Math.min(index * 0.1, 1)}s` }}
                  >
                    <ResourceCard
                      id={resource.id}
                      title={resource.title}
                      description={resource.description}
                      author={resource.profiles.username || resource.profiles.full_name || "Anonyme"}
                      authorUsername={resource.profiles.username || undefined}
                      category={resource.category}
                      tags={resource.tags}
                      resourceType={resource.resource_type}
                      averageRating={resource.average_rating}
                      ratingsCount={resource.ratings_count}
                      downloads={resource.downloads_count}
                      views={resource.views_count}
                      lastUpdated={new Date(resource.updated_at).toLocaleDateString("fr-FR")}
                      visibility={resource.visibility as any}
                    />
                  </div>
                ))}
              </div>
              <div className="text-center">
                <Link to="/browse">
                  <Button size="lg" variant="outline" className="gap-2 hover-scale">
                    Voir toutes les ressources populaires
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <NoResources />
          )}
        </div>

        {/* Créations récentes */}
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 backdrop-blur-sm mb-4">
              <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Nouveau</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Créations <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">Récentes</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Découvrez les dernières ressources partagées par la communauté
            </p>
          </div>

          {loadingRecent ? (
            <ResourceGridSkeleton count={6} />
          ) : recentResources.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {recentResources.map((resource, index) => (
                  <div
                    key={resource.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${Math.min(index * 0.1, 1)}s` }}
                  >
                    <ResourceCard
                      id={resource.id}
                      title={resource.title}
                      description={resource.description}
                      author={resource.profiles.username || resource.profiles.full_name || "Anonyme"}
                      authorUsername={resource.profiles.username || undefined}
                      category={resource.category}
                      tags={resource.tags}
                      resourceType={resource.resource_type}
                      averageRating={resource.average_rating}
                      ratingsCount={resource.ratings_count}
                      downloads={resource.downloads_count}
                      views={resource.views_count}
                      lastUpdated={new Date(resource.updated_at).toLocaleDateString("fr-FR")}
                      visibility={resource.visibility as any}
                    />
                  </div>
                ))}
              </div>
              <div className="text-center">
                <Link to="/browse">
                  <Button size="lg" variant="outline" className="gap-2 hover-scale">
                    Voir toutes les créations récentes
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <NoResources />
          )}
        </div>


        {/* Collections publiques */}
        <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm mb-4">
              <FolderOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Collections</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Collections <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">Publiques</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explorez les collections organisées et partagées par la communauté
            </p>
          </div>

          {loadingCollections ? (
            <ResourceGridSkeleton count={6} />
          ) : publicCollections.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {publicCollections.map((collection, index) => (
                  <div
                    key={collection.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${Math.min(index * 0.1, 1)}s` }}
                  >
                    <CollectionCard collection={collection} />
                  </div>
                ))}
              </div>
              <div className="text-center">
                <Link to="/collections">
                  <Button size="lg" variant="outline" className="gap-2 hover-scale">
                    Voir toutes les collections
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucune collection publique disponible pour le moment</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};


import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResourceCard } from "@/components/ResourceCard";
import { ResourceGridSkeleton } from "@/components/LoadingStates";
import { HomeRecommendations } from "@/components/HomeRecommendations";
import { TopSuggestionsSection } from "@/components/TopSuggestionsSection";
import { Categories } from "@/components/Categories";
import { 
  FileText, 
  Share2, 
  Lightbulb, 
  TrendingUp, 
  Plus, 
  ArrowRight,
  Clock,
  Users,
  BarChart3,
  Sparkles
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useResources } from "@/hooks/useResources";
import { useSharedWithMe } from "@/hooks/useSharedResources";
import { useQuery } from "@tanstack/react-query";
import { client } from "@/integrations/client";
import { useCreateResource } from "@/contexts/CreateResourceContext";
import { useTemplateSelector } from "@/contexts/TemplateSelectorContext";

export const HomeUser = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openCreateResource } = useCreateResource();
  const { openTemplateSelector } = useTemplateSelector();

  // Récupérer les ressources récentes de l'utilisateur
  const { data: allResources = [], isLoading: loadingMyResources } = useResources();
  const recentMyResources = (allResources || [])
    .filter(r => {
      // Vérifier plusieurs propriétés possibles pour l'ID utilisateur
      const userId = user?.id || user?.userId || user?.user_id;
      const resourceUserId = r.user_id || r.userId;
      return resourceUserId === userId;
    })
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6);

  // Récupérer les ressources partagées
  const { data: sharedResources = [], isLoading: loadingShared } = useSharedWithMe();
  const recentSharedResources = (sharedResources || [])
    .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6);

  // Récupérer les suggestions en attente de l'utilisateur
  const { data: pendingSuggestions = [], isLoading: loadingSuggestions } = useQuery({
    queryKey: ["user-pending-suggestions", user?.id || user?.userId],
    queryFn: async () => {
      if (!user) return [];
      const response = await client.request('/api/suggestions', {
        method: 'GET',
        params: { status: 'pending', limit: 5 }
      });
      return response.data?.data || [];
    },
    enabled: !!user,
  });

  // Statistiques personnelles - s'assurer que toutes les valeurs sont définies
  const stats = {
    myResources: recentMyResources?.length || 0,
    sharedWithMe: sharedResources?.length || 0,
    pendingSuggestions: pendingSuggestions?.length || 0,
    totalViews: (recentMyResources || [])
      .reduce((sum, r) => sum + (r.views_count || 0), 0),
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-24 pb-20">
        {/* Hero Section pour User */}
        <section className="py-16 bg-gradient-subtle">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Bienvenue, <span className="bg-gradient-primary bg-clip-text text-transparent">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur'}
                </span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Gérez vos ressources, explorez celles partagées avec vous et contribuez à la communauté
              </p>
              
              {/* Actions rapides */}
              <div className="flex flex-wrap gap-3 justify-center mt-8">
                <Button 
                  size="lg" 
                  onClick={() => openCreateResource()}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Créer une ressource
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => openTemplateSelector()}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Utiliser un template
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/browse')}
                  className="gap-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  Explorer
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Statistiques */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
              <Card className="p-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{stats.myResources}</div>
                <div className="text-sm text-muted-foreground">Mes ressources</div>
              </Card>
              <Card className="p-6 text-center">
                <Share2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold">{stats.sharedWithMe}</div>
                <div className="text-sm text-muted-foreground">Partagées avec moi</div>
              </Card>
              <Card className="p-6 text-center">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                <div className="text-2xl font-bold">{stats.pendingSuggestions}</div>
                <div className="text-sm text-muted-foreground">Suggestions</div>
              </Card>
              <Card className="p-6 text-center">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold">{stats.totalViews}</div>
                <div className="text-sm text-muted-foreground">Vues totales</div>
              </Card>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 space-y-16">
          {/* Mes ressources récentes */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2">Mes ressources récentes</h2>
                <p className="text-muted-foreground">Vos dernières créations</p>
              </div>
              <Link to="/my-resources">
                <Button variant="outline" className="gap-2">
                  Voir tout
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {loadingMyResources ? (
              <ResourceGridSkeleton count={6} />
            ) : (recentMyResources || []).length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(recentMyResources || []).map((resource) => (
                  <ResourceCard
                    key={resource.id}
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
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Aucune ressource</h3>
                <p className="text-muted-foreground mb-6">
                  Commencez par créer votre première ressource
                </p>
                <Button onClick={() => openCreateResource()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une ressource
                </Button>
              </Card>
            )}
          </section>

          {/* Ressources partagées avec moi */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2">Partagées avec moi</h2>
                <p className="text-muted-foreground">Ressources que d'autres utilisateurs ont partagées avec vous</p>
              </div>
              <Link to="/shared-with-me">
                <Button variant="outline" className="gap-2">
                  Voir tout
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {loadingShared ? (
              <ResourceGridSkeleton count={6} />
            ) : (recentSharedResources || []).length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(recentSharedResources || []).map((resource: any) => (
                  <ResourceCard
                    key={resource.id}
                    id={resource.id}
                    title={resource.title}
                    description={resource.description}
                    author={resource.profiles?.username || resource.profiles?.full_name || "Anonyme"}
                    authorUsername={resource.profiles?.username || undefined}
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
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Share2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Aucune ressource partagée</h3>
                <p className="text-muted-foreground">
                  Les ressources que d'autres utilisateurs partagent avec vous apparaîtront ici
                </p>
              </Card>
            )}
          </section>

          {/* Suggestions en attente */}
          {(pendingSuggestions || []).length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Mes suggestions en attente</h2>
                  <p className="text-muted-foreground">Vos suggestions en attente d'approbation</p>
                </div>
                <Link to="/suggestions">
                  <Button variant="outline" className="gap-2">
                    Voir tout
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(pendingSuggestions || []).slice(0, 6).map((suggestion: any) => (
                  <Card key={suggestion.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary">{suggestion.type}</Badge>
                      <Badge variant="outline" className="gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {suggestion.votesCount || 0}
                      </Badge>
                    </div>
                    <h3 className="font-semibold mb-1">{suggestion.name}</h3>
                    {suggestion.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {suggestion.description}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>

        <HomeRecommendations />
        <TopSuggestionsSection />
        <Categories />
      </main>

      <Footer />
    </div>
  );
};


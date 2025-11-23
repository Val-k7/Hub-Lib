import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ResourceCard } from "@/components/ResourceCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Bookmark, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { localClient } from "@/integrations/local/client";
import { useSavedResources, Resource } from "@/hooks/useResources";
import { ResourceGridSkeleton, PageLoader } from "@/components/LoadingStates";
import { NoUserResources, NoSavedResources } from "@/components/EmptyStates";

const MyResources = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("created");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: createdResources = [], isLoading: loadingCreated } = useQuery({
    queryKey: ["my-resources"],
    queryFn: async () => {
      const { data, error } = await localClient
        .from("resources")
        .select(`
          *,
          profiles!inner(username, full_name, avatar_url)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .execute();

      if (error) throw error;
      return data as Resource[];
    },
    enabled: !!user,
  });

  const { data: savedResources = [], isLoading: loadingSaved } = useSavedResources();

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-32 pb-12">
          <div className="container mx-auto px-4">
            <PageLoader message="Chargement de vos ressources..." />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-12 bg-gradient-hero border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                  Mes <span className="text-primary">Ressources</span>
                </h1>
                <p className="text-lg text-muted-foreground">
                  Gérez vos ressources créées et sauvegardées
                </p>
              </div>
              <Button
                size="lg"
                className="gap-2 shadow-glow"
                onClick={() => navigate("/create-resource")}
              >
                <Plus className="h-5 w-5" />
                Nouvelle Ressource
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 py-12 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="created" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Créées ({createdResources.length})
                </TabsTrigger>
                <TabsTrigger value="saved" className="gap-2">
                  <Bookmark className="h-4 w-4" />
                  Sauvegardées ({savedResources.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="created" className="mt-8">
                {loadingCreated ? (
                  <ResourceGridSkeleton count={4} />
                ) : createdResources.length === 0 ? (
                  <NoUserResources />
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {createdResources.map((resource) => (
                      <ResourceCard
                        key={resource.id}
                        id={resource.id}
                        title={resource.title}
                        description={resource.description}
                        author={
                          resource.profiles.username ||
                          resource.profiles.full_name ||
                          "Anonyme"
                        }
                        authorUsername={resource.profiles.username || undefined}
                        category={resource.category}
                        tags={resource.tags}
                        resourceType={resource.resource_type}
                        averageRating={resource.average_rating}
                        ratingsCount={resource.ratings_count}
                        downloads={resource.downloads_count}
                        views={resource.views_count}
                        lastUpdated={new Date(
                          resource.updated_at
                        ).toLocaleDateString("fr-FR")}
                        visibility={resource.visibility as any}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="saved" className="mt-8">
                {loadingSaved ? (
                  <ResourceGridSkeleton count={4} />
                ) : savedResources.length === 0 ? (
                  <NoSavedResources />
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {savedResources.map((resource) => (
                      <ResourceCard
                        key={resource.id}
                        id={resource.id}
                        title={resource.title}
                        description={resource.description}
                        author={
                          resource.profiles.username ||
                          resource.profiles.full_name ||
                          "Anonyme"
                        }
                        authorUsername={resource.profiles.username || undefined}
                        category={resource.category}
                        tags={resource.tags}
                        resourceType={resource.resource_type}
                        averageRating={resource.average_rating}
                        ratingsCount={resource.ratings_count}
                        downloads={resource.downloads_count}
                        views={resource.views_count}
                        lastUpdated={new Date(
                          resource.updated_at
                        ).toLocaleDateString("fr-FR")}
                        visibility={resource.visibility as any}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MyResources;

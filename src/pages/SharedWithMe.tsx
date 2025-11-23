import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ResourceCard } from "@/components/ResourceCard";
import { useSharedWithMe } from "@/hooks/useSharedResources";
import { ResourceGridSkeleton } from "@/components/LoadingStates";
import { NoResources } from "@/components/EmptyStates";
import { Users } from "lucide-react";

const SharedWithMe = () => {
  const { data: resources = [], isLoading } = useSharedWithMe();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <section className="pt-32 pb-12 bg-gradient-hero border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Partagé avec <span className="bg-gradient-primary bg-clip-text text-transparent">moi</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Découvrez les ressources qui ont été partagées avec vous
            </p>
          </div>
        </div>
      </section>

      <main className="flex-1 py-12 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 p-4 bg-card/50 backdrop-blur-sm rounded-lg border border-border/50">
              <p className="text-sm font-medium">
                {resources.length} ressource{resources.length > 1 ? "s" : ""} partagée{resources.length > 1 ? "s" : ""}
              </p>
            </div>

            {isLoading ? (
              <ResourceGridSkeleton count={6} />
            ) : resources.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucune ressource partagée</h3>
                <p className="text-muted-foreground">
                  Aucune ressource n'a encore été partagée avec vous
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {resources.map((resource, index) => (
                  <div
                    key={resource.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${Math.min(index * 0.05, 1)}s` }}
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
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SharedWithMe;

import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ResourceCard } from "@/components/ResourceCard";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { localClient } from "@/integrations/local/client";
import { Resource } from "@/hooks/useResources";
import { useAuth } from "@/hooks/useAuth";
import { Github, Calendar, Star, Download, Eye, FileText, Edit, Settings } from "lucide-react";
import { UserStats } from "@/components/UserStats";
import { DataManagement } from "@/components/DataManagement";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProfileData {
  id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  github_username: string | null;
  created_at: string;
}

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const { data, error } = await localClient
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (error) throw error;
      return data as ProfileData;
    },
    enabled: !!username,
  });

  const { data: resources = [], isLoading: loadingResources } = useQuery({
    queryKey: ["user-resources", profile?.id],
    queryFn: async () => {
      const { data, error } = await localClient
        .from("resources")
        .select(`
          *,
          profiles!inner(username, full_name, avatar_url)
        `)
        .eq("user_id", profile!.id)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .execute();

      if (error) throw error;
      return data as Resource[];
    },
    enabled: !!profile?.id,
  });

  // Calculate stats
  const stats = {
    totalResources: resources.length,
    avgRating: resources.length > 0 
      ? resources.reduce((sum, r) => sum + r.average_rating, 0) / resources.length 
      : 0,
    totalDownloads: resources.reduce((sum, r) => sum + r.downloads_count, 0),
    totalViews: resources.reduce((sum, r) => sum + r.views_count, 0),
  };

  const isOwnProfile = user?.id === profile?.id;

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-32 pb-12">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto space-y-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-32 pb-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold mb-4">Profil non trouvé</h1>
            <p className="text-muted-foreground">
              L'utilisateur que vous recherchez n'existe pas.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-32 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            {/* Profile Header */}
            <Card className="p-8 mb-8 border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl">
                    {(profile.username || profile.full_name || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-3xl font-bold">
                        {profile.full_name || profile.username || "Utilisateur"}
                      </h1>
                      {profile.username && (
                        <p className="text-muted-foreground">@{profile.username}</p>
                      )}
                    </div>
                    {user?.id === profile.id && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => navigate(`/profile/${username}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                          Modifier
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Settings className="h-4 w-4" />
                              Données
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                              <DialogTitle>Gestion des données</DialogTitle>
                            </DialogHeader>
                            <DataManagement />
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>

                  {profile.bio && (
                    <p className="text-foreground/80">{profile.bio}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Membre depuis{" "}
                        {formatDistanceToNow(new Date(profile.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                    </div>

                    {profile.github_username && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 h-auto p-0 hover:text-foreground"
                        onClick={() =>
                          window.open(
                            `https://github.com/${profile.github_username}`,
                            "_blank"
                          )
                        }
                      >
                        <Github className="h-4 w-4" />
                        <span>@{profile.github_username}</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
                <div className="flex flex-col items-center text-center">
                  <FileText className="h-8 w-8 text-primary mb-2" />
                  <div className="text-3xl font-bold">{stats.totalResources}</div>
                  <div className="text-sm text-muted-foreground">Ressources</div>
                </div>
              </Card>

              <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
                <div className="flex flex-col items-center text-center">
                  <Star className="h-8 w-8 text-yellow-500 mb-2" />
                  <div className="text-3xl font-bold">{stats.avgRating.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground">Note moyenne</div>
                </div>
              </Card>

              <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
                <div className="flex flex-col items-center text-center">
                  <Download className="h-8 w-8 text-green-500 mb-2" />
                  <div className="text-3xl font-bold">{stats.totalDownloads}</div>
                  <div className="text-sm text-muted-foreground">
                    Téléchargements
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
                <div className="flex flex-col items-center text-center">
                  <Eye className="h-8 w-8 text-blue-500 mb-2" />
                  <div className="text-3xl font-bold">{stats.totalViews}</div>
                  <div className="text-sm text-muted-foreground">Vues</div>
                </div>
              </Card>
            </div>

            {/* Statistics - Only show for own profile */}
            {isOwnProfile && resources.length > 0 && (
              <div className="mb-8">
                <UserStats resources={resources} />
              </div>
            )}

            {/* Resources */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  Ressources publiques
                </h2>
                <Badge variant="secondary">
                  {resources.length} ressource{resources.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {loadingResources ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                  ))}
                </div>
              ) : resources.length === 0 ? (
                <Card className="p-12 text-center border-border/50 bg-card/50 backdrop-blur-sm">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Aucune ressource publique pour le moment
                  </p>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {resources.map((resource) => (
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
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;

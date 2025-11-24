import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Comments } from "@/components/Comments";
import { VersionHistory } from "@/components/VersionHistory";
import { useParams } from "react-router-dom";
import { useResource, useToggleSaveResource, useSavedResources, useIncrementDownloads, useDeleteResource, useForkResource } from "@/hooks/useResources";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ShareResourceDialog } from "@/components/ShareResourceDialog";
import { ShareToGitHub } from "@/components/ShareToGitHub";
import { ShareToGoogleDrive } from "@/components/ShareToGoogleDrive";
import {
  Star,
  GitFork,
  Download,
  Eye,
  Github,
  Clock,
  FileText,
  Bookmark,
  Share2,
  ExternalLink,
  Edit,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const ResourceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: resource, isLoading } = useResource(id!);
  const { data: savedResources = [] } = useSavedResources();
  const toggleSave = useToggleSaveResource();
  const incrementDownloads = useIncrementDownloads();
  const deleteResource = useDeleteResource();
  const forkResource = useForkResource();
  const queryClient = useQueryClient();

  const isSaved = savedResources.some((r) => r.id === id);

  const handleSave = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    toggleSave.mutate({ resourceId: id!, isSaved });
  };

  const handleDownload = () => {
    if (resource?.file_url) {
      incrementDownloads.mutate(id!);
      window.open(resource.file_url, "_blank");
    }
  };

  const handleDelete = () => {
    deleteResource.mutate(id!, {
      onSuccess: () => {
        navigate("/my-resources");
      },
    });
  };

  const handleFork = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    forkResource.mutate(id!, {
      onSuccess: (newResource) => {
        navigate(`/resource/${newResource.id}/edit`);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-32 pb-12">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-32 pb-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold">Ressource non trouvée</h1>
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
            {/* Header */}
            <div className="space-y-6 mb-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Badge variant="secondary">{resource.category}</Badge>
                  <h1 className="text-4xl font-bold tracking-tight">
                    {resource.title}
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    {resource.description}
                  </p>
                </div>
                <div className="flex gap-2">
                  {user?.id === resource.user_id && (
                    <>
                      <Button
                        variant="outline"
                        size="lg"
                        className="gap-2"
                        onClick={() => navigate(`/resource/${id}/edit`)}
                      >
                        <Edit className="h-5 w-5" />
                        Modifier
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="lg"
                            className="gap-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-5 w-5" />
                            Supprimer
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer la ressource</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer cette ressource ? Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDelete}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <ShareResourceDialog 
                        resourceId={resource.id} 
                        currentVisibility={resource.visibility as any}
                      />
                    </>
                  )}
                  {user && user.id !== resource.user_id && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="gap-2"
                      onClick={handleFork}
                      disabled={forkResource.isPending}
                    >
                      <GitFork className="h-5 w-5" />
                      Fork
                    </Button>
                  )}
                  {resource.file_url && (
                    <Button
                      variant="default"
                      size="lg"
                      className="gap-2 shadow-glow"
                      onClick={handleDownload}
                    >
                      <Download className="h-5 w-5" />
                      Télécharger
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2"
                    onClick={handleSave}
                    disabled={toggleSave.isPending}
                  >
                    <Bookmark
                      className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`}
                    />
                  </Button>
                </div>
              </div>

              {/* Author & Stats */}
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    if (resource.profiles.username) {
                      navigate(`/profile/${resource.profiles.username}`);
                    }
                  }}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {(resource.profiles.username || resource.profiles.full_name || "A")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    {resource.profiles.username ? `@${resource.profiles.username}` : resource.profiles.full_name || "Anonyme"}
                  </span>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Star className="h-4 w-4" />
                  <span className="font-medium text-foreground">{resource.average_rating.toFixed(1)}</span> ({resource.ratings_count} notes)
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Download className="h-4 w-4" />
                  <span className="font-medium text-foreground">{resource.downloads_count}</span> téléchargements
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span className="font-medium text-foreground">{resource.views_count}</span> vues
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {resource.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_300px] gap-8">
              {/* Main Content */}
              <div className="space-y-6">
                {/* README */}
                <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl font-semibold">README.md</h2>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {resource.readme ? (
                      <pre className="whitespace-pre-wrap text-sm text-foreground/80 font-mono bg-muted/50 p-4 rounded-lg">
                        {resource.readme}
                      </pre>
                    ) : (
                      <p className="text-muted-foreground">Aucune documentation disponible</p>
                    )}
                  </div>
                </Card>

                {/* Actions */}
                <div className="flex gap-3 flex-wrap">
                  {resource.github_url && (
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 min-w-[150px]"
                      onClick={() => window.open(resource.github_url!, "_blank")}
                    >
                      <Github className="h-4 w-4" />
                      Voir sur GitHub
                    </Button>
                  )}
                  {user && user.id === resource.user_id && (
                    <>
                      <ShareToGitHub resourceId={resource.id} resourceTitle={resource.title} />
                      <ShareToGoogleDrive resourceId={resource.id} resourceTitle={resource.title} />
                    </>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 min-w-[150px]"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                    Partager
                  </Button>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm space-y-4">
                  <h3 className="font-semibold">Informations</h3>
                  
                  <div className="space-y-3 text-sm">
                    {resource.language && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Langage</span>
                          <Badge variant="secondary">{resource.language}</Badge>
                        </div>
                        <Separator />
                      </>
                    )}
                    {resource.file_size && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Taille</span>
                          <span className="font-medium">{resource.file_size}</span>
                        </div>
                        <Separator />
                      </>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">License</span>
                      <span className="font-medium">{resource.license}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <div className="flex-1">
                        <div className="text-xs">
                          Mis à jour{" "}
                          {formatDistanceToNow(new Date(resource.updated_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </div>
                        <div className="text-xs">
                          Créé le {new Date(resource.created_at).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

              </div>
            </div>
          </div>

          {/* Version History Section */}
          {resource && (
            <>
              <Separator className="my-8" />
              <VersionHistory resourceId={id!} resourceOwnerId={resource.user_id} />
            </>
          )}

          {/* Comments Section */}
          <Separator className="my-8" />
          <Comments resourceId={id!} />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ResourceDetail;

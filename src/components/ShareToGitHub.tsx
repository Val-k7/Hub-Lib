import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Github, LoaderCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { githubService, type GitHubRepository } from "@/services/githubService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface ShareToGitHubProps {
  resourceId: string;
  resourceTitle: string;
}

export const ShareToGitHub = ({ resourceId, resourceTitle }: ShareToGitHubProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [newRepoName, setNewRepoName] = useState("");
  const [repoDescription, setRepoDescription] = useState(`Ressource: ${resourceTitle}`);
  const [repoPrivate, setRepoPrivate] = useState(false);
  const [filePath, setFilePath] = useState("README.md");
  const [branch, setBranch] = useState("main");
  const [owner, setOwner] = useState("");

  // Récupérer les informations de l'utilisateur GitHub
  const { data: githubUser, isLoading: loadingUser } = useQuery({
    queryKey: ["github-user"],
    queryFn: () => githubService.getUserInfo(),
    enabled: open && !!user,
    retry: false,
  });

  // Récupérer les repositories avec pagination
  const { data: reposResult, isLoading: loadingRepos } = useQuery<{ repositories: GitHubRepository[]; hasMore: boolean; nextPage?: number }>({
    queryKey: ["github-repositories"],
    queryFn: () => githubService.listRepositories({ type: "owner", sort: "updated", direction: "desc", useCache: true }),
    enabled: open && !!user && mode === "existing",
    retry: false,
  });
  
  const repositories = reposResult?.repositories || [];

  // Mutation pour partager la ressource
  const shareMutation = useMutation({
    mutationFn: async () => {
      if (mode === "existing") {
        if (!selectedRepo) {
          throw new Error("Veuillez sélectionner un repository");
        }
        const repo = repositories.find((r) => r.full_name === selectedRepo);
        if (!repo) {
          throw new Error("Repository non trouvé");
        }
        const [repoOwner, repoName] = selectedRepo.split("/");
        return githubService.shareResource({
          resourceId,
          owner: repoOwner,
          repo: repoName,
          path: filePath,
          branch,
        });
      } else {
        if (!newRepoName) {
          throw new Error("Veuillez entrer un nom de repository");
        }
        const finalOwner = owner || githubUser?.login || "";
        if (!finalOwner) {
          throw new Error("Impossible de déterminer le propriétaire");
        }
        return githubService.shareResource({
          resourceId,
          owner: finalOwner,
          repo: newRepoName,
          path: filePath,
          branch,
          createRepo: true,
          repoDescription,
          repoPrivate,
        });
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["resource", resourceId] });
      toast({
        title: "Ressource partagée",
        description: `La ressource a été partagée vers ${result.repository.url}`,
      });
      setOpen(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de partager la ressource vers GitHub",
        variant: "destructive",
      });
    },
  });

  // Mettre à jour le propriétaire quand l'utilisateur GitHub est chargé
  useEffect(() => {
    if (githubUser && !owner) {
      setOwner(githubUser.login);
    }
  }, [githubUser, owner]);

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Github className="h-4 w-4" />
          Partager vers GitHub
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Partager vers GitHub
          </DialogTitle>
          <DialogDescription>
            Partagez cette ressource vers un repository GitHub existant ou créez-en un nouveau.
          </DialogDescription>
        </DialogHeader>

        {loadingUser ? (
          <div className="flex items-center justify-center py-8">
            <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !githubUser ? (
          <div className="flex items-center gap-2 text-destructive py-8">
            <AlertCircle className="h-5 w-5" />
            <p>Aucun compte GitHub lié. Veuillez lier un compte dans vos paramètres de profil.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Mode de partage */}
            <div className="space-y-2">
              <Label>Mode de partage</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as "existing" | "new")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">Repository existant</SelectItem>
                  <SelectItem value="new">Nouveau repository</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Repository existant */}
            {mode === "existing" && (
              <div className="space-y-2">
                <Label>Repository</Label>
                {loadingRepos ? (
                  <div className="flex items-center justify-center py-4">
                    <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : repositories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun repository trouvé</p>
                ) : (
                  <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un repository" />
                    </SelectTrigger>
                    <SelectContent>
                      {repositories.map((repo) => (
                        <SelectItem key={repo.id} value={repo.full_name}>
                          <div className="flex items-center gap-2">
                            <span>{repo.full_name}</span>
                            {repo.private && <Badge variant="secondary">Privé</Badge>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Nouveau repository */}
            {mode === "new" && (
              <>
                <div className="space-y-2">
                  <Label>Propriétaire</Label>
                  <Input
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder={githubUser.login}
                  />
                  <p className="text-xs text-muted-foreground">
                    Laissez vide pour utiliser votre compte ({githubUser.login})
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>
                    Nom du repository <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    placeholder="mon-repository"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={repoDescription}
                    onChange={(e) => setRepoDescription(e.target.value)}
                    placeholder="Description du repository"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="private">Repository privé</Label>
                  <Switch
                    id="private"
                    checked={repoPrivate}
                    onCheckedChange={setRepoPrivate}
                  />
                </div>
              </>
            )}

            {/* Options communes */}
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label>Chemin du fichier</Label>
                <Input
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="README.md"
                />
                <p className="text-xs text-muted-foreground">
                  Chemin où le fichier sera créé dans le repository
                </p>
              </div>

              <div className="space-y-2">
                <Label>Branche</Label>
                <Input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => shareMutation.mutate()}
            disabled={shareMutation.isPending || loadingUser || loadingRepos}
            className="gap-2"
          >
            {shareMutation.isPending ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Partage en cours...
              </>
            ) : (
              <>
                <Github className="h-4 w-4" />
                Partager
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoaderCircle, AlertCircle } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { googleDriveService, type GoogleDriveFolder } from "@/services/googleDriveService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface ShareToGoogleDriveProps {
  resourceId: string;
  resourceTitle: string;
}

export const ShareToGoogleDrive = ({ resourceId, resourceTitle }: ShareToGoogleDriveProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [newFolderName, setNewFolderName] = useState(`Hub-Lib - ${resourceTitle}`);
  const [sharePublic, setSharePublic] = useState(false);

  // Récupérer les informations de l'utilisateur Google
  const { data: googleUser, isLoading: loadingUser } = useQuery({
    queryKey: ["google-drive-user"],
    queryFn: () => googleDriveService.getUserInfo(),
    enabled: open && !!user,
    retry: false,
  });

  // Récupérer les dossiers avec pagination
  const { data: foldersResult, isLoading: loadingFolders } = useQuery({
    queryKey: ["google-drive-folders"],
    queryFn: () => googleDriveService.listFolders(undefined, { useCache: true }),
    enabled: open && !!user && mode === "existing",
    retry: false,
  });
  
  const folders = foldersResult?.folders || [];

  // Mutation pour partager la ressource
  const shareMutation = useMutation({
    mutationFn: async () => {
      if (mode === "existing") {
        if (!selectedFolderId) {
          throw new Error("Veuillez sélectionner un dossier");
        }
        return googleDriveService.shareResource({
          resourceId,
          folderId: selectedFolderId,
          sharePublic,
        });
      } else {
        if (!newFolderName) {
          throw new Error("Veuillez entrer un nom de dossier");
        }
        return googleDriveService.shareResource({
          resourceId,
          folderName: newFolderName,
          createFolder: true,
          sharePublic,
        });
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["resource", resourceId] });
      toast({
        title: "Ressource partagée",
        description: `La ressource a été partagée vers Google Drive${result.files.length > 0 ? ` (${result.files.length} fichier${result.files.length > 1 ? 's' : ''})` : ''}`,
      });
      setOpen(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de partager la ressource vers Google Drive",
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FcGoogle className="h-4 w-4" />
          Partager vers Drive
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FcGoogle className="h-5 w-5" />
            Partager vers Google Drive
          </DialogTitle>
          <DialogDescription>
            Partagez cette ressource vers un dossier Google Drive existant ou créez-en un nouveau.
          </DialogDescription>
        </DialogHeader>

        {loadingUser ? (
          <div className="flex items-center justify-center py-8">
            <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !googleUser ? (
          <div className="flex items-center gap-2 text-destructive py-8">
            <AlertCircle className="h-5 w-5" />
            <p>Aucun compte Google lié. Veuillez lier un compte dans vos paramètres de profil.</p>
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
                  <SelectItem value="existing">Dossier existant</SelectItem>
                  <SelectItem value="new">Nouveau dossier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dossier existant */}
            {mode === "existing" && (
              <div className="space-y-2">
                <Label>Dossier</Label>
                {loadingFolders ? (
                  <div className="flex items-center justify-center py-4">
                    <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : folders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun dossier trouvé</p>
                ) : (
                  <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un dossier" />
                    </SelectTrigger>
                    <SelectContent>
                      {folders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Nouveau dossier */}
            {mode === "new" && (
              <div className="space-y-2">
                <Label>
                  Nom du dossier <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Mon dossier Hub-Lib"
                />
              </div>
            )}

            {/* Options */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="share-public">Partager publiquement</Label>
                  <p className="text-xs text-muted-foreground">
                    Permet à quiconque avec le lien d'accéder aux fichiers
                  </p>
                </div>
                <Switch
                  id="share-public"
                  checked={sharePublic}
                  onCheckedChange={setSharePublic}
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
            disabled={shareMutation.isPending || loadingUser || loadingFolders}
            className="gap-2"
          >
            {shareMutation.isPending ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Partage en cours...
              </>
            ) : (
              <>
                <FcGoogle className="h-4 w-4" />
                Partager
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


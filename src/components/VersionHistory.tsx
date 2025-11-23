import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useResourceVersionHistory, useRestoreVersion } from "@/hooks/useVersioning";
import { useAuth } from "@/hooks/useAuth";
import { History, RotateCcw, User, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface VersionHistoryProps {
  resourceId: string;
  resourceOwnerId: string;
}

export const VersionHistory = ({ resourceId, resourceOwnerId }: VersionHistoryProps) => {
  const { user } = useAuth();
  const { data: versions, isLoading } = useResourceVersionHistory(resourceId);
  const restoreVersion = useRestoreVersion();
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);

  const isOwner = user?.id === resourceOwnerId;

  const handleRestore = async () => {
    if (!selectedVersion) return;
    await restoreVersion.mutateAsync({ resourceId, versionId: selectedVersion });
    setIsRestoreDialogOpen(false);
    setSelectedVersion(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Chargement de l'historique...
        </CardContent>
      </Card>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique des versions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Aucune version enregistrée pour cette ressource
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historique des versions
        </CardTitle>
        <CardDescription>
          {versions.length} version{versions.length !== 1 ? 's' : ''} enregistrée{versions.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {versions.map((version, index) => (
            <div
              key={version.id}
              className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={index === 0 ? "default" : "outline"}>
                    Version {version.version_number}
                    {index === 0 && " (actuelle)"}
                  </Badge>
                  {version.change_summary && (
                    <span className="text-sm text-muted-foreground">
                      {version.change_summary}
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDistanceToNow(new Date(version.created_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </div>
                  {version.creator && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-3 w-3" />
                      {version.creator.full_name || version.creator.username}
                    </div>
                  )}
                </div>
              </div>
              {isOwner && index !== 0 && (
                <Dialog open={isRestoreDialogOpen && selectedVersion === version.id} onOpenChange={(open) => {
                  setIsRestoreDialogOpen(open);
                  if (!open) setSelectedVersion(null);
                }}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedVersion(version.id);
                        setIsRestoreDialogOpen(true);
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restaurer
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Restaurer la version {version.version_number}</DialogTitle>
                      <DialogDescription>
                        Êtes-vous sûr de vouloir restaurer cette ressource à la version {version.version_number} ?
                        Une nouvelle version sera créée avec l'état actuel avant la restauration.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsRestoreDialogOpen(false);
                          setSelectedVersion(null);
                        }}
                      >
                        Annuler
                      </Button>
                      <Button onClick={handleRestore} disabled={restoreVersion.isPending}>
                        {restoreVersion.isPending ? "Restauration..." : "Restaurer"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};



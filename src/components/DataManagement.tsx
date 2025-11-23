import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Database, AlertCircle } from "lucide-react";
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
import { localClient } from "@/integrations/local/client";

export const DataManagement = () => {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = () => {
    try {
      // Récupérer toutes les données depuis localStorage
      const tables = [
        "profiles",
        "resources",
        "saved_resources",
        "resource_ratings",
        "resource_shares",
        "resource_comments",
        "groups",
        "group_members",
        "notifications",
        "category_tag_suggestions",
        "suggestion_votes",
        "user_roles",
      ];

      const data = localClient.exportData();

      // Créer le fichier JSON
      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hub-lib-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: "Vos données ont été exportées avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur d'export",
        description: error.message || "Impossible d'exporter les données",
        variant: "destructive",
      });
    }
  };

  const handleImport = async (file: File) => {
    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Valider la structure
      if (typeof data !== "object" || data === null) {
        throw new Error("Format de fichier invalide");
      }

      // Demander confirmation
      const confirmed = window.confirm(
        "L'import va remplacer toutes vos données actuelles. Êtes-vous sûr de continuer ?"
      );

      if (!confirmed) {
        setIsImporting(false);
        return;
      }

      // Importer les données
      localClient.importData(data);
      const importedCount = Object.values(data).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);

      // Recharger la page pour appliquer les changements
      toast({
        title: "Import réussi",
        description: `${importedCount} enregistrements importés. La page va se recharger.`,
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Erreur d'import",
        description: error.message || "Impossible d'importer les données",
        variant: "destructive",
      });
      setIsImporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImport(file);
    }
    // Reset input
    e.target.value = "";
  };

  const handleClearAll = () => {
    try {
      const tables = [
        "profiles",
        "resources",
        "saved_resources",
        "resource_ratings",
        "resource_shares",
        "resource_comments",
        "groups",
        "group_members",
        "notifications",
        "category_tag_suggestions",
        "suggestion_votes",
        "user_roles",
      ];

      tables.forEach((table) => {
        const key = `hub-lib-db-${table}`;
        localStorage.removeItem(key);
      });

      // Réinitialiser la base de données
      (localClient as any).initializeDatabase();

      toast({
        title: "Données effacées",
        description: "Toutes les données ont été supprimées. La page va se recharger.",
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'effacer les données",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Gestion des données</h3>
        </div>

        <div className="space-y-4">
          {/* Export */}
          <div className="space-y-2">
            <Label>Exporter les données</Label>
            <p className="text-sm text-muted-foreground">
              Téléchargez toutes vos données au format JSON
            </p>
            <Button onClick={handleExport} className="w-full gap-2">
              <Download className="h-4 w-4" />
              Exporter les données
            </Button>
          </div>

          <div className="border-t border-border/50" />

          {/* Import */}
          <div className="space-y-2">
            <Label>Importer des données</Label>
            <p className="text-sm text-muted-foreground">
              Importez des données depuis un fichier JSON
            </p>
            <div className="flex gap-2">
              <Input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                disabled={isImporting}
                className="flex-1"
              />
              {isImporting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Import en cours...
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border/50" />

          {/* Clear All */}
          <div className="space-y-2">
            <Label className="text-destructive">Zone de danger</Label>
            <p className="text-sm text-muted-foreground">
              Supprime toutes les données et réinitialise l'application
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Effacer toutes les données
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Toutes vos données seront définitivement
                    supprimées et l'application sera réinitialisée. Cette action ne peut pas être
                    annulée.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Oui, tout effacer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </Card>
  );
};


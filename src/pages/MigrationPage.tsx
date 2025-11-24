/**
 * Page de migration des données localStorage vers PostgreSQL
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, Upload, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { exportLocalStorageData, downloadExportFile, migrateToBackend } from '@/scripts/exportLocalStorageData';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

export default function MigrationPage() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [exportResult, setExportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [exportStats, setExportStats] = useState<{ tables: number; totalRecords: number } | null>(null);

  const handleExport = () => {
    setIsExporting(true);
    try {
      const data = exportLocalStorageData();
      
      // Calculer les statistiques
      const tables = Object.keys(data.tables).length;
      const totalRecords = Object.values(data.tables).reduce((sum, records) => sum + records.length, 0);
      setExportStats({ tables, totalRecords });

      downloadExportFile();
      setExportResult({
        success: true,
        message: `Export réussi : ${tables} tables, ${totalRecords} enregistrements`,
      });
      logger.info('Export des données localStorage réussi', { tables, totalRecords });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setExportResult({
        success: false,
        message: `Erreur lors de l'export : ${errorMessage}`,
      });
      logger.error('Erreur lors de l\'export des données', error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsExporting(false);
    }
  };

  const handleMigrate = async () => {
    if (!user) {
      setMigrationResult({
        success: false,
        message: 'Vous devez être connecté pour migrer les données',
      });
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const result = await migrateToBackend(apiUrl);
      setMigrationResult(result);
      
      if (result.success) {
        logger.info('Migration des données réussie');
      } else {
        logger.error('Erreur lors de la migration', new Error(result.message));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setMigrationResult({
        success: false,
        message: `Erreur lors de la migration : ${errorMessage}`,
      });
      logger.error('Erreur lors de la migration', error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Migration des données</CardTitle>
          <CardDescription>
            Exportez vos données depuis localStorage ou migrez-les directement vers PostgreSQL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistiques */}
          {exportStats && (
            <Alert>
              <AlertTitle>Statistiques de l'export</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside mt-2">
                  <li>{exportStats.tables} tables exportées</li>
                  <li>{exportStats.totalRecords} enregistrements au total</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Export */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Export vers fichier JSON</h3>
            <p className="text-sm text-muted-foreground">
              Exportez toutes vos données depuis localStorage vers un fichier JSON que vous pourrez sauvegarder ou importer plus tard.
            </p>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full sm:w-auto"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Export en cours...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter vers JSON
                </>
              )}
            </Button>
            {exportResult && (
              <Alert variant={exportResult.success ? 'default' : 'destructive'}>
                {exportResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertTitle>{exportResult.success ? 'Succès' : 'Erreur'}</AlertTitle>
                <AlertDescription>{exportResult.message}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Migration */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold">Migration vers PostgreSQL</h3>
            <p className="text-sm text-muted-foreground">
              Migrez directement vos données depuis localStorage vers la base de données PostgreSQL via l'API backend.
              Vous devez être connecté et avoir les droits administrateur.
            </p>
            {!user && (
              <Alert variant="destructive">
                <AlertTitle>Authentification requise</AlertTitle>
                <AlertDescription>
                  Vous devez être connecté pour migrer les données.
                </AlertDescription>
              </Alert>
            )}
            <Button
              onClick={handleMigrate}
              disabled={isMigrating || !user}
              className="w-full sm:w-auto"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Migration en cours...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Migrer vers PostgreSQL
                </>
              )}
            </Button>
            {migrationResult && (
              <Alert variant={migrationResult.success ? 'default' : 'destructive'}>
                {migrationResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertTitle>{migrationResult.success ? 'Succès' : 'Erreur'}</AlertTitle>
                <AlertDescription>{migrationResult.message}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Avertissements */}
          <Alert variant="default">
            <AlertTitle>Important</AlertTitle>
            <AlertDescription className="space-y-2">
              <ul className="list-disc list-inside space-y-1">
                <li>La migration remplace les données existantes dans PostgreSQL</li>
                <li>Assurez-vous d'avoir fait une sauvegarde avant de migrer</li>
                <li>Les données dans localStorage ne sont pas supprimées après la migration</li>
                <li>Vous pouvez exporter vos données en JSON pour les sauvegarder</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}


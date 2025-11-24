#!/bin/bash

# Script pour configurer les backups automatiques PostgreSQL
# Usage: sudo ./scripts/setup-backup-cron.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-postgres.sh"

echo "🔧 Configuration des backups automatiques PostgreSQL..."

# Vérifier que le script de backup existe
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "❌ Erreur: Script de backup non trouvé: $BACKUP_SCRIPT"
    exit 1
fi

# Rendre le script exécutable
chmod +x "$BACKUP_SCRIPT"

# Créer le répertoire de backups s'il n'existe pas
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups/postgres}"
mkdir -p "$BACKUP_DIR"

# Créer une entrée cron pour exécuter le backup tous les jours à 2h du matin
CRON_JOB="0 2 * * * cd $PROJECT_DIR && $BACKUP_SCRIPT >> $PROJECT_DIR/logs/backup-cron.log 2>&1"

# Vérifier si la tâche cron existe déjà
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
    echo "⚠️  Une tâche cron existe déjà pour ce script"
    echo "   Pour la supprimer: crontab -e"
else
    # Ajouter la tâche cron
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Tâche cron ajoutée avec succès"
    echo "   Le backup s'exécutera tous les jours à 2h du matin"
fi

# Créer le répertoire de logs
mkdir -p "$PROJECT_DIR/logs"

echo ""
echo "📋 Tâche cron configurée:"
crontab -l | grep "$BACKUP_SCRIPT" || echo "   (aucune tâche trouvée)"
echo ""
echo "✅ Configuration terminée !"
echo ""
echo "💡 Commandes utiles:"
echo "   - Voir les tâches cron: crontab -l"
echo "   - Éditer les tâches cron: crontab -e"
echo "   - Tester le backup manuellement: $BACKUP_SCRIPT"
echo "   - Voir les logs: tail -f $PROJECT_DIR/logs/backup-cron.log"


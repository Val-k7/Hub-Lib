#!/bin/bash

# Script de backup PostgreSQL pour Hub-Lib
# Usage: ./scripts/backup-postgres.sh

set -e

# Configuration
CONTAINER_NAME="hub-lib-postgres"
BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
DB_NAME="${POSTGRES_DB:-hub_lib}"
DB_USER="${POSTGRES_USER:-hub_lib_user}"
RETENTION_DAYS=30

# Créer le dossier de backup
mkdir -p "$BACKUP_DIR"

# Date pour le nom du fichier
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_${DATE}.sql"

echo "🔄 Début du backup PostgreSQL..."
echo "   Base: $DB_NAME"
echo "   Fichier: $BACKUP_FILE"

# Effectuer le backup
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"

# Compresser le backup
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "✅ Backup terminé: $BACKUP_FILE"

# Supprimer les anciens backups (plus de RETENTION_DAYS jours)
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "🧹 Anciens backups supprimés (> $RETENTION_DAYS jours)"

# Afficher la taille du backup
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "📦 Taille: $BACKUP_SIZE"

echo "✅ Backup PostgreSQL terminé avec succès !"


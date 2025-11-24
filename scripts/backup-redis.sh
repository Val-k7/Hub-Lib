#!/bin/bash

# Script de backup Redis pour Hub-Lib
# Usage: ./scripts/backup-redis.sh

set -e

# Configuration
CONTAINER_NAME="hub-lib-redis"
BACKUP_DIR="${BACKUP_DIR:-./backups/redis}"
REDIS_PASSWORD="${REDIS_PASSWORD}"
RETENTION_DAYS=7

# Créer le dossier de backup
mkdir -p "$BACKUP_DIR"

# Date pour le nom du fichier
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/dump_${DATE}.rdb"

echo "🔄 Début du backup Redis..."

# Déclencher BGSAVE
if [ -n "$REDIS_PASSWORD" ]; then
    docker exec "$CONTAINER_NAME" redis-cli --no-auth-warning -a "$REDIS_PASSWORD" BGSAVE
else
    docker exec "$CONTAINER_NAME" redis-cli BGSAVE
fi

# Attendre que BGSAVE se termine
echo "⏳ Attente de la fin du BGSAVE..."
while true; do
    if [ -n "$REDIS_PASSWORD" ]; then
        STATUS=$(docker exec "$CONTAINER_NAME" redis-cli --no-auth-warning -a "$REDIS_PASSWORD" LASTSAVE)
    else
        STATUS=$(docker exec "$CONTAINER_NAME" redis-cli LASTSAVE)
    fi
    
    if [ "$STATUS" != "0" ]; then
        break
    fi
    sleep 1
done

# Copier le dump
docker cp "$CONTAINER_NAME:/data/dump.rdb" "$BACKUP_FILE"

echo "✅ Backup terminé: $BACKUP_FILE"

# Compresser le backup
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Supprimer les anciens backups (plus de RETENTION_DAYS jours)
find "$BACKUP_DIR" -name "dump_*.rdb.gz" -mtime +$RETENTION_DAYS -delete

echo "🧹 Anciens backups supprimés (> $RETENTION_DAYS jours)"

# Afficher la taille du backup
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "📦 Taille: $BACKUP_SIZE"

echo "✅ Backup Redis terminé avec succès !"



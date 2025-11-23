#!/bin/bash

# Script de sauvegarde pour la production
# Usage: ./scripts/backup.sh

set -e

echo "💾 Sauvegarde de HubLib..."

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
POSTGRES_CONTAINER="hub-lib-postgres-prod"
POSTGRES_USER=${POSTGRES_USER:-hub_lib_user}
POSTGRES_DB=${POSTGRES_DB:-hub_lib}

# Créer le répertoire de sauvegarde
mkdir -p $BACKUP_DIR

# Sauvegarder PostgreSQL
echo "📦 Sauvegarde de PostgreSQL..."
docker exec $POSTGRES_CONTAINER pg_dump -U $POSTGRES_USER $POSTGRES_DB > $BACKUP_DIR/postgres_$DATE.sql

# Compresser la sauvegarde
gzip $BACKUP_DIR/postgres_$DATE.sql

# Sauvegarder Redis (optionnel - seulement si persistance activée)
echo "📦 Sauvegarde de Redis..."
docker exec hub-lib-redis-prod redis-cli --rdb /data/dump.rdb

# Garder seulement les 30 dernières sauvegardes
echo "🧹 Nettoyage des anciennes sauvegardes..."
ls -t $BACKUP_DIR/*.sql.gz | tail -n +31 | xargs -r rm

echo "✅ Sauvegarde terminée: $BACKUP_DIR/postgres_$DATE.sql.gz"


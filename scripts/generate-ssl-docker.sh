#!/bin/bash
# Script pour générer les certificats SSL avec Certbot via Docker
# Usage: sudo ./scripts/generate-ssl-docker.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

DOMAIN="hublib.ovh"
EMAIL="admin@hublib.ovh"
WEBROOT="/var/www/certbot"

echo "🔐 Génération des certificats SSL pour $DOMAIN avec Certbot Docker"
echo ""

# Vérifier que le répertoire existe
if [ ! -d "$WEBROOT" ]; then
    echo "❌ Erreur: Le répertoire $WEBROOT n'existe pas"
    exit 1
fi

# S'assurer que le répertoire est accessible
sudo mkdir -p "$WEBROOT/.well-known/acme-challenge"
sudo chmod -R 755 "$WEBROOT"
sudo chown -R debian:debian "$WEBROOT" || true

# Générer les certificats avec Certbot dans Docker
echo "📝 Génération des certificats avec Certbot Docker..."
docker run --rm \
  --network hub-lib_hub-lib-network \
  -v "$WEBROOT:/var/www/certbot:rw" \
  -v /etc/letsencrypt:/etc/letsencrypt:rw \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive

if [ $? -eq 0 ]; then
    echo "✅ Certificats générés avec succès!"
    echo ""
    
    # Copier les certificats vers le répertoire Docker
    echo "📦 Copie des certificats vers docker/nginx/ssl/$DOMAIN/"
    mkdir -p docker/nginx/ssl/$DOMAIN/
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem docker/nginx/ssl/$DOMAIN/
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem docker/nginx/ssl/$DOMAIN/
    sudo chown -R debian:debian docker/nginx/ssl/
    
    echo "✅ Certificats copiés"
    echo ""
    echo "🔄 Réactivation de la configuration HTTPS..."
    mv docker/nginx/conf.d/hublib.ovh.conf.disabled docker/nginx/conf.d/hublib.ovh.conf 2>/dev/null || true
    
    echo "🔄 Redémarrage de Nginx..."
    docker compose restart nginx
    
    echo ""
    echo "✅ Configuration SSL terminée!"
    echo "🌐 Testez: https://$DOMAIN"
else
    echo "❌ Erreur lors de la génération des certificats"
    exit 1
fi


#!/bin/bash
# Script pour générer les certificats SSL avec Let's Encrypt
# Usage: sudo ./scripts/generate-ssl.sh

set -e

# Se placer dans le répertoire du projet
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

DOMAIN="hublib.ovh"
EMAIL="admin@hublib.ovh"
WEBROOT="/var/www/certbot"

echo "🔐 Génération des certificats SSL pour $DOMAIN"
echo ""

# Vérifier que le répertoire existe
if [ ! -d "$WEBROOT" ]; then
    echo "❌ Erreur: Le répertoire $WEBROOT n'existe pas"
    exit 1
fi

# Vérifier que Nginx fonctionne
if ! curl -s http://$DOMAIN/.well-known/acme-challenge/test > /dev/null 2>&1; then
    echo "⚠️  Attention: Le challenge ACME pourrait ne pas être accessible"
fi

# Générer les certificats
echo "📝 Génération des certificats avec Certbot..."
certbot certonly \
    --webroot \
    -w "$WEBROOT" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive \

if [ $? -eq 0 ]; then
    echo "✅ Certificats générés avec succès!"
    echo ""
    
    # Copier les certificats vers le répertoire Docker
    echo "📦 Copie des certificats vers docker/nginx/ssl/$DOMAIN/"
    mkdir -p docker/nginx/ssl/$DOMAIN/
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem docker/nginx/ssl/$DOMAIN/
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem docker/nginx/ssl/$DOMAIN/
    chown -R debian:debian docker/nginx/ssl/
    
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


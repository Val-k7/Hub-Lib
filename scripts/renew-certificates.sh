#!/bin/bash
# Script de renouvellement automatique des certificats SSL
# À exécuter via cron pour renouveler les certificats Let's Encrypt

set -e

echo "Vérification du renouvellement des certificats SSL..."

# Renouveler les certificats (ne fait rien s'ils ne sont pas proches de l'expiration)
certbot renew --quiet --webroot -w /var/www/certbot

# Redémarrer Nginx pour charger les nouveaux certificats
if [ -f /var/run/docker.pid ]; then
    docker restart hub-lib-nginx
    echo "Nginx redémarré avec succès"
else
    systemctl reload nginx || docker restart hub-lib-nginx
    echo "Nginx rechargé avec succès"
fi

echo "Renouvellement terminé"


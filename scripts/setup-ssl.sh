#!/bin/bash

# Script pour configurer SSL avec Let's Encrypt pour hublib.ovh
# Usage: ./scripts/setup-ssl.sh

set -e

echo "🔒 Configuration SSL pour hublib.ovh..."

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Vérifier que certbot est installé
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}⚠️  Certbot n'est pas installé${NC}"
    echo "Installation de Certbot..."
    
    # Détecter le système d'exploitation
    if [ -f /etc/debian_version ]; then
        sudo apt-get update
        sudo apt-get install -y certbot
    elif [ -f /etc/redhat-release ]; then
        sudo yum install -y certbot
    else
        echo -e "${RED}❌ Système d'exploitation non supporté${NC}"
        exit 1
    fi
fi

# Créer le répertoire pour les certificats
mkdir -p docker/nginx/ssl/hublib.ovh

# Obtenir les certificats
echo -e "${YELLOW}📜 Obtention des certificats Let's Encrypt...${NC}"

sudo certbot certonly \
    --standalone \
    --preferred-challenges http \
    -d hublib.ovh \
    -d www.hublib.ovh \
    --email admin@hublib.ovh \
    --agree-tos \
    --non-interactive

# Copier les certificats dans le répertoire Docker
sudo cp /etc/letsencrypt/live/hublib.ovh/fullchain.pem docker/nginx/ssl/hublib.ovh/
sudo cp /etc/letsencrypt/live/hublib.ovh/privkey.pem docker/nginx/ssl/hublib.ovh/
sudo chown -R $USER:$USER docker/nginx/ssl/

echo -e "${GREEN}✅ Certificats SSL configurés avec succès!${NC}"

# Configurer le renouvellement automatique
echo -e "${YELLOW}🔄 Configuration du renouvellement automatique...${NC}"

# Créer un script de renouvellement
cat > scripts/renew-ssl.sh << 'EOF'
#!/bin/bash
# Renouveler les certificats et redémarrer Nginx

sudo certbot renew --quiet

# Copier les nouveaux certificats
sudo cp /etc/letsencrypt/live/hublib.ovh/fullchain.pem docker/nginx/ssl/hublib.ovh/
sudo cp /etc/letsencrypt/live/hublib.ovh/privkey.pem docker/nginx/ssl/hublib.ovh/
sudo chown -R $USER:$USER docker/nginx/ssl/

# Redémarrer Nginx
docker exec hub-lib-nginx-prod nginx -s reload
EOF

chmod +x scripts/renew-ssl.sh

# Ajouter une tâche cron pour le renouvellement (2 fois par jour)
(crontab -l 2>/dev/null; echo "0 0,12 * * * cd $(pwd) && ./scripts/renew-ssl.sh") | crontab -

echo -e "${GREEN}✅ Renouvellement automatique configuré!${NC}"


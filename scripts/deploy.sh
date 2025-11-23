#!/bin/bash

# Script de déploiement pour hublib.ovh
# Usage: ./scripts/deploy.sh

set -e

echo "🚀 Déploiement de HubLib vers hublib.ovh..."

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    exit 1
fi

# Vérifier que Docker Compose est installé
if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
    exit 1
fi

# Vérifier que le fichier .env.production existe
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}⚠️  Fichier .env.production non trouvé${NC}"
    echo -e "${RED}❌ Veuillez créer .env.production avec les variables nécessaires${NC}"
    echo "Variables requises: POSTGRES_PASSWORD, REDIS_PASSWORD, JWT_SECRET"
    exit 1
fi

# Charger les variables d'environnement depuis .env.production
if [ -f .env.production ]; then
    set -a
    source .env.production
    set +a
    echo -e "${GREEN}✅ Variables d'environnement chargées depuis .env.production${NC}"
else
    echo -e "${RED}❌ Fichier .env.production non trouvé${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Variables d'environnement chargées${NC}"

# Construire les images Docker
echo -e "${YELLOW}📦 Construction des images Docker...${NC}"
docker compose --env-file .env.production build --no-cache

# Arrêter les containers existants
echo -e "${YELLOW}🛑 Arrêt des containers existants...${NC}"
docker compose --env-file .env.production down

# Démarrer les services
echo -e "${YELLOW}🚀 Démarrage des services...${NC}"
docker compose --env-file .env.production up -d

# Attendre que les services soient prêts
echo -e "${YELLOW}⏳ Attente que les services soient prêts...${NC}"
sleep 10

# Vérifier la santé des services
echo -e "${YELLOW}🏥 Vérification de la santé des services...${NC}"

# PostgreSQL
if docker exec hub-lib-postgres pg_isready -U ${POSTGRES_USER:-hub_lib_user} > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL est prêt${NC}"
else
    echo -e "${RED}❌ PostgreSQL n'est pas prêt${NC}"
    exit 1
fi

# Redis
if docker exec hub-lib-redis redis-cli --no-auth-warning -a ${REDIS_PASSWORD} ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis est prêt${NC}"
else
    echo -e "${RED}❌ Redis n'est pas prêt${NC}"
    exit 1
fi

# Nginx
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx est prêt${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx n'est pas encore prêt (peut prendre quelques secondes)${NC}"
fi

echo -e "${GREEN}🎉 Déploiement terminé avec succès!${NC}"
echo ""
echo "📊 Services disponibles:"
echo "   - Frontend: http://localhost (ou https://hublib.ovh)"
echo "   - PostgreSQL: localhost:5432 (hub_lib)"
echo "   - Redis: localhost:6379"
echo ""
echo "📝 Voir les logs:"
echo "   docker compose --env-file .env.production logs -f"
echo ""
echo "💡 Note: Le backend API n'est pas encore implémenté."
echo "   PostgreSQL et Redis sont prêts pour la migration future."


#!/bin/bash

# Script de validation complète du système
# Vérifie que tous les services sont opérationnels

set -e

echo "🔍 Démarrage de la validation du système Hub-Lib..."
echo ""

# Couleurs pour l'output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Fonction pour vérifier un service
check_service() {
    local name=$1
    local command=$2
    
    echo -n "Vérification de $name... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ ÉCHEC${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# 1. Vérifier PostgreSQL
echo "📊 Base de données PostgreSQL:"
check_service "PostgreSQL" "pg_isready -h localhost -p 5432" || {
    echo "   ⚠️  PostgreSQL n'est pas accessible. Vérifiez que le service est démarré."
}

# 2. Vérifier Redis
echo ""
echo "🔴 Cache Redis:"
check_service "Redis" "redis-cli -h localhost -p 6379 ping" || {
    echo "   ⚠️  Redis n'est pas accessible. Vérifiez que le service est démarré."
}

# 3. Vérifier que le backend répond
echo ""
echo "🚀 Backend API:"
BACKEND_URL=${BACKEND_URL:-"http://localhost:3000"}
check_service "Backend API" "curl -f -s $BACKEND_URL/health" || {
    echo "   ⚠️  Le backend API n'est pas accessible sur $BACKEND_URL"
}

# 4. Vérifier les variables d'environnement
echo ""
echo "🔐 Variables d'environnement:"
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✅ Fichier .env trouvé${NC}"
    
    # Vérifier les variables critiques
    required_vars=("DATABASE_URL" "REDIS_HOST" "JWT_SECRET")
    for var in "${required_vars[@]}"; do
        if grep -q "^${var}=" backend/.env; then
            echo -e "   ${GREEN}✅${NC} $var défini"
        else
            echo -e "   ${RED}❌${NC} $var manquant"
            ERRORS=$((ERRORS + 1))
        fi
    done
else
    echo -e "${YELLOW}⚠️  Fichier .env non trouvé (utilisez .env.example)${NC}"
fi

# 5. Vérifier Prisma
echo ""
echo "🗄️  Prisma:"
if [ -d "backend/prisma" ]; then
    echo -e "${GREEN}✅ Schéma Prisma trouvé${NC}"
    
    cd backend
    if npx prisma validate > /dev/null 2>&1; then
        echo -e "   ${GREEN}✅${NC} Schéma Prisma valide"
    else
        echo -e "   ${RED}❌${NC} Schéma Prisma invalide"
        ERRORS=$((ERRORS + 1))
    fi
    cd ..
else
    echo -e "${RED}❌ Dossier Prisma non trouvé${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 6. Vérifier les dépendances
echo ""
echo "📦 Dépendances:"
if [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}✅ node_modules backend trouvé${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules backend non trouvé (exécutez: cd backend && npm install)${NC}"
fi

if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules frontend trouvé${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules frontend non trouvé (exécutez: npm install)${NC}"
fi

# 7. Résumé
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Validation réussie ! Le système est prêt.${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS erreur(s) détectée(s). Veuillez les corriger avant de continuer.${NC}"
    exit 1
fi



# 🚀 Guide d'Installation et de Démarrage

**Version** : 1.0.0  
**Date** : 2024

## 📋 Prérequis

- Docker et Docker Compose installés
- Node.js 20+ (pour développement local)
- PostgreSQL 16+ (si non Dockerisé)
- Redis 7+ (si non Dockerisé)

## 🔧 Installation Complète

### Option 1 : Déploiement Docker (Recommandé)

#### 1. Cloner le projet
```bash
git clone <repository-url>
cd Hub-Lib
```

#### 2. Configuration des variables d'environnement

Créer un fichier `.env.production` à la racine :

```env
# PostgreSQL
POSTGRES_DB=hub_lib
POSTGRES_USER=hub_lib_user
POSTGRES_PASSWORD=votre_mot_de_passe_fort

# Redis
REDIS_PASSWORD=votre_mot_de_passe_redis_fort

# Backend API
NODE_ENV=production
JWT_SECRET=votre_secret_jwt_très_long_et_aléatoire
JWT_REFRESH_SECRET=votre_secret_refresh_jwt_très_long_et_aléatoire
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Frontend
VITE_API_URL=http://localhost:3001

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:8080

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**⚠️ Important** : Changez tous les mots de passe par défaut !

#### 3. Démarrer tous les services

```bash
# Construire et démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Voir les logs d'un service spécifique
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis
```

#### 4. Vérifier l'état des services

```bash
# Vérifier que tous les services sont démarrés
docker-compose ps

# Vérifier la santé de PostgreSQL
docker exec hub-lib-postgres pg_isready -U hub_lib_user

# Vérifier Redis
docker exec hub-lib-redis redis-cli -a $REDIS_PASSWORD ping
```

#### 5. Accéder à l'application

- **Frontend** : http://localhost (via Nginx)
- **Backend API** : http://localhost:3001
- **Health Check Backend** : http://localhost:3001/health

---

### Option 2 : Développement Local

#### 1. Configuration de la base de données

Démarrer PostgreSQL et Redis avec Docker :

```bash
# Démarrer seulement PostgreSQL et Redis
docker-compose up -d postgres redis

# Attendre que les services soient prêts
docker-compose ps
```

#### 2. Configuration du Backend

```bash
cd backend

# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env avec vos configurations
nano .env
```

Configurer `.env` :
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://hub_lib_user:votre_password@localhost:5432/hub_lib?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=votre_redis_password
JWT_SECRET=votre_secret_jwt
JWT_REFRESH_SECRET=votre_secret_refresh
```

#### 3. Installer les dépendances et initialiser

```bash
cd backend

# Installer les dépendances
npm install

# Générer le client Prisma
npm run prisma:generate

# Créer les migrations (si nécessaire)
npm run prisma:migrate dev

# Ou push le schéma directement
npm run prisma:push
```

#### 4. Démarrer le backend

```bash
# Mode développement (watch)
npm run dev

# Mode production
npm run build
npm start
```

Le backend sera accessible sur http://localhost:3001

#### 5. Configuration du Frontend

```bash
cd ..

# Installer les dépendances du frontend
npm install

# Copier les variables d'environnement
cp .env.example .env

# Configurer .env
VITE_API_URL=http://localhost:3001
```

#### 6. Démarrer le frontend

```bash
npm run dev
```

Le frontend sera accessible sur http://localhost:5173

---

## ✅ Vérification de l'Installation

### Backend

```bash
# Health check
curl http://localhost:3001/health

# Devrait retourner :
# {
#   "status": "ok",
#   "timestamp": "...",
#   "uptime": ...,
#   "environment": "development"
# }
```

### PostgreSQL

```bash
# Se connecter à PostgreSQL
docker exec -it hub-lib-postgres psql -U hub_lib_user -d hub_lib

# Vérifier les tables
\dt

# Devrait afficher 19 tables
```

### Redis

```bash
# Se connecter à Redis
docker exec -it hub-lib-redis redis-cli -a $REDIS_PASSWORD

# Tester
PING
# Devrait répondre : PONG
```

---

## 📚 Utilisation

### API Endpoints

Voir `docs/API_ENDPOINTS.md` pour la documentation complète de tous les endpoints.

### Exemple d'utilisation

```bash
# Inscription
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "username": "testuser"
  }'

# Connexion
curl -X POST http://localhost:3001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Utiliser le token pour accéder aux ressources
curl -X GET http://localhost:3001/api/resources \
  -H "Authorization: Bearer <access_token>"
```

---

## 🔧 Commandes Utiles

### Docker Compose

```bash
# Démarrer tous les services
docker-compose up -d

# Arrêter tous les services
docker-compose down

# Reconstruire les images
docker-compose build

# Voir les logs
docker-compose logs -f

# Redémarrer un service
docker-compose restart backend
```

### Base de Données

```bash
# Backup PostgreSQL
docker exec hub-lib-postgres pg_dump -U hub_lib_user hub_lib > backup.sql

# Restore PostgreSQL
docker exec -i hub-lib-postgres psql -U hub_lib_user hub_lib < backup.sql

# Backup Redis
docker exec hub-lib-redis redis-cli -a $REDIS_PASSWORD SAVE
```

### Backend

```bash
cd backend

# Générer le client Prisma
npm run prisma:generate

# Ouvrir Prisma Studio (interface graphique)
npm run prisma:studio

# Créer une migration
npm run prisma:migrate dev --name migration_name

# Voir les logs en temps réel
npm run dev
```

---

## 🐛 Dépannage

### Le backend ne démarre pas

1. Vérifier que PostgreSQL et Redis sont démarrés :
```bash
docker-compose ps
```

2. Vérifier les variables d'environnement :
```bash
cd backend
cat .env
```

3. Vérifier les logs :
```bash
docker-compose logs backend
```

### Erreur de connexion à PostgreSQL

1. Vérifier que PostgreSQL est démarré :
```bash
docker exec hub-lib-postgres pg_isready -U hub_lib_user
```

2. Vérifier la DATABASE_URL dans `.env`

3. Vérifier les credentials

### Erreur de connexion à Redis

1. Vérifier que Redis est démarré :
```bash
docker exec hub-lib-redis redis-cli -a $REDIS_PASSWORD ping
```

2. Vérifier REDIS_PASSWORD dans `.env`

### Prisma generate échoue

```bash
cd backend
rm -rf node_modules/.prisma
npm run prisma:generate
```

---

## 📝 Notes Importantes

1. **Mots de passe** : Changez tous les mots de passe par défaut en production
2. **JWT_SECRET** : Utilisez un secret très long et aléatoire (minimum 32 caractères)
3. **Variables d'environnement** : Ne commitez jamais les fichiers `.env`
4. **Backups** : Configurez des backups réguliers de PostgreSQL et Redis

---

**Installation terminée ! L'application est prête à être utilisée ! 🎉**



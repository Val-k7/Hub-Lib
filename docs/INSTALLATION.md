# 📦 Guide d'Installation - Hub-Lib

**Date** : 2024  
**Version** : 1.0.0

---

## 📋 Prérequis

- **Node.js** : 18+ (recommandé 20+)
- **PostgreSQL** : 14+ (ou via Docker)
- **Redis** : 6+ (ou via Docker)
- **Docker & Docker Compose** (recommandé pour développement)

---

## 🚀 Installation Rapide (Docker)

### 1. Cloner le Repository

```bash
git clone <repository-url>
cd Hub-Lib
```

### 2. Configuration

```bash
# Copier les fichiers d'environnement
cp backend/.env.example backend/.env
cp .env.example .env

# Éditer les fichiers .env avec vos valeurs
nano backend/.env
nano .env
```

### 3. Démarrer avec Docker Compose

```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Vérifier le statut
docker-compose ps
```

Les services seront disponibles sur :
- **Frontend** : http://localhost:5173
- **Backend** : http://localhost:3001
- **PostgreSQL** : localhost:5432
- **Redis** : localhost:6379

---

## 🔧 Installation Manuelle

### 1. Base de Données

#### PostgreSQL

```bash
# Installer PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Créer la base de données
sudo -u postgres psql
CREATE DATABASE hub_lib;
CREATE USER hub_lib_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE hub_lib TO hub_lib_user;
\q
```

#### Redis

```bash
# Installer Redis (Ubuntu/Debian)
sudo apt install redis-server

# Démarrer Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Configurer le mot de passe (optionnel)
redis-cli
CONFIG SET requirepass "your_redis_password"
```

### 2. Backend

```bash
cd backend

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env avec vos valeurs
nano .env

# Générer le client Prisma
npm run prisma:generate

# Lancer les migrations
npm run prisma:migrate

# Démarrer en développement
npm run dev
```

### 3. Frontend

```bash
# À la racine du projet
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env
nano .env

# Démarrer en développement
npm run dev
```

---

## ⚙️ Configuration

### Variables d'Environnement Backend

Fichier : `backend/.env`

```env
# Environnement
NODE_ENV=development
PORT=3001

# PostgreSQL
DATABASE_URL=postgresql://hub_lib_user:password@localhost:5432/hub_lib
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=hub_lib
POSTGRES_USER=hub_lib_user
POSTGRES_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT (générez des secrets forts)
JWT_SECRET=your_jwt_secret_minimum_32_characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_secret_minimum_32_characters
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### Variables d'Environnement Frontend

Fichier : `.env`

```env
VITE_API_URL=http://localhost:3001
VITE_USE_API_CLIENT=true
```

---

## 🗄️ Base de Données

### Initialisation

```bash
cd backend

# Générer le client Prisma
npm run prisma:generate

# Créer les migrations
npm run prisma:migrate

# (Optionnel) Ajouter des données de test
npm run prisma:studio
```

### Données Initiales

Les données initiales (catégories, tags) sont créées automatiquement lors de la première migration.

Pour ajouter des données de test :

```bash
cd backend
npm run prisma:studio
```

Ouvrez Prisma Studio et ajoutez des données manuellement.

---

## ✅ Vérification

### Backend

```bash
# Health check
curl http://localhost:3001/health

# Réponse attendue :
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

### Frontend

Ouvrez http://localhost:5173 dans votre navigateur.

---

## 🐛 Dépannage

### Erreur de connexion PostgreSQL

```bash
# Vérifier que PostgreSQL tourne
sudo systemctl status postgresql

# Vérifier la connexion
psql -h localhost -U hub_lib_user -d hub_lib
```

### Erreur de connexion Redis

```bash
# Vérifier que Redis tourne
sudo systemctl status redis-server

# Test de connexion
redis-cli ping
# Réponse attendue : PONG
```

### Erreur Prisma

```bash
cd backend

# Régénérer le client
npm run prisma:generate

# Réappliquer les migrations
npm run prisma:migrate reset
```

### Port déjà utilisé

```bash
# Trouver le processus utilisant le port
lsof -i :3001
lsof -i :5173

# Tuer le processus
kill -9 <PID>
```

---

## 📚 Commandes Utiles

### Backend

```bash
cd backend

# Développement
npm run dev

# Build
npm run build
npm start

# Prisma
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio

# Tests
npm test
npm run test:coverage
```

### Docker

```bash
# Démarrer tous les services
docker-compose up -d

# Arrêter tous les services
docker-compose down

# Voir les logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Redémarrer un service
docker-compose restart backend

# Supprimer tout (attention : supprime les données)
docker-compose down -v
```

---

## 🔒 Sécurité

### Secrets

⚠️ **NE JAMAIS COMMITER** les fichiers `.env` !

Les secrets doivent être :
- Uniques pour chaque environnement
- Longs (minimum 32 caractères pour JWT)
- Aléatoires
- Stockés de manière sécurisée

### Génération de Secrets

```bash
# Générer un secret JWT
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Générer un mot de passe PostgreSQL
openssl rand -base64 32
```

---

## 📝 Prochaines Étapes

1. ✅ Installation complète
2. 📖 Lire la [documentation](./architecture.md)
3. 🔄 Migrer les données (voir [migration-guide.md](./migration-guide.md))
4. 🚀 Déployer en production (voir [deployment.md](./deployment.md))

---

## 🆘 Support

- 📖 [Documentation complète](./architecture.md)
- 🐛 [Issues GitHub](https://github.com/your-repo/issues)
- 💬 [Discussions](https://github.com/your-repo/discussions)

---

**Installation terminée ! Bon développement ! 🎉**

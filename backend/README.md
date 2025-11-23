# 🚀 Hub-Lib Backend API

Backend API pour Hub-Lib - Migration complète vers PostgreSQL et Redis.

## 📋 Prérequis

- Node.js 20+ 
- PostgreSQL 16+
- Redis 7+
- Docker & Docker Compose (recommandé)

## 🏗️ Architecture

```
backend/
├── src/
│   ├── config/         # Configuration (env, database, redis)
│   ├── models/         # Modèles de données
│   ├── routes/         # Routes Express
│   ├── services/       # Services métier
│   ├── middleware/     # Middleware Express
│   ├── utils/          # Utilitaires
│   └── server.ts       # Point d'entrée
├── prisma/
│   ├── schema.prisma   # Schéma Prisma
│   └── migrations/     # Migrations
└── package.json
```

## 🚀 Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env avec vos configurations
nano .env

# Générer le client Prisma
npm run prisma:generate

# Créer/migrer la base de données
npm run prisma:migrate
```

## 🔧 Configuration

Variables d'environnement principales :

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/hub_lib
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret_key
```

Voir `.env.example` pour toutes les variables.

## 📝 Scripts Disponibles

```bash
# Développement
npm run dev          # Démarrer en mode développement (watch)

# Production
npm run build        # Compiler TypeScript
npm start            # Démarrer le serveur

# Prisma
npm run prisma:generate  # Générer le client Prisma
npm run prisma:migrate   # Créer une migration
npm run prisma:studio    # Ouvrir Prisma Studio
npm run prisma:push      # Push le schéma vers la DB

# Tests
npm test             # Lancer les tests
npm run test:coverage # Tests avec couverture
```

## 🗄️ Base de Données

### Prisma

Le schéma Prisma est dans `prisma/schema.prisma`. Il correspond au schéma PostgreSQL dans `docker/postgres/init.sql`.

### Migrations

```bash
# Créer une nouvelle migration
npm run prisma:migrate -- --name migration_name

# Appliquer les migrations
npm run prisma:migrate deploy
```

## 🔴 Redis

Redis est utilisé pour :
- Cache des requêtes fréquentes
- Sessions utilisateurs
- Rate limiting
- Pub/Sub pour notifications temps réel
- Queue de tâches

## 📚 API Endpoints

### Authentification
- `POST /api/auth/signup` - Inscription
- `POST /api/auth/signin` - Connexion
- `POST /api/auth/signout` - Déconnexion
- `POST /api/auth/refresh` - Rafraîchir le token
- `GET /api/auth/session` - Session actuelle

### Ressources
- `GET /api/resources` - Liste des ressources
- `GET /api/resources/:id` - Détails d'une ressource
- `POST /api/resources` - Créer une ressource
- `PUT /api/resources/:id` - Mettre à jour
- `DELETE /api/resources/:id` - Supprimer

### Collections
- `GET /api/collections` - Liste des collections
- `GET /api/collections/:id` - Détails
- `POST /api/collections` - Créer
- ...

(Voir le roadmap.md pour la liste complète)

## 🧪 Tests

```bash
# Tous les tests
npm test

# Tests en mode watch
npm run test:watch

# Couverture de code
npm run test:coverage
```

## 📦 Déploiement

### Docker

```bash
# Build l'image
docker build -t hub-lib-backend .

# Lancer avec docker-compose
docker-compose up -d
```

### Variables d'environnement de production

Assurez-vous de configurer :
- `NODE_ENV=production`
- `JWT_SECRET` (clé forte)
- `DATABASE_URL` (URL PostgreSQL)
- `REDIS_URL` (URL Redis)

## 📝 Développement

### Structure des routes

```typescript
// src/routes/resources.ts
import express from 'express';
const router = express.Router();

router.get('/', async (req, res) => {
  // ...
});

export default router;
```

### Middleware d'authentification

```typescript
import { authMiddleware } from '../middleware/auth';

router.get('/protected', authMiddleware, async (req, res) => {
  // req.user contient les infos de l'utilisateur
});
```

## 🔐 Sécurité

- Helmet pour les headers HTTP sécurisés
- CORS configuré
- Rate limiting avec Redis
- Validation avec Zod
- JWT pour l'authentification

## 📊 Logging

Le logging utilise Winston. Les logs sont écrits dans :
- `logs/combined.log` - Tous les logs
- `logs/error.log` - Erreurs seulement
- `logs/critical.log` - Erreurs critiques (production)

## 🤝 Contribution

Voir le roadmap.md pour les prochaines étapes de développement.

## 📄 Licence

MIT



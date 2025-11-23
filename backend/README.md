# Hub-Lib Backend API

Backend API pour Hub-Lib utilisant PostgreSQL, Redis, Express et Socket.IO.

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose (recommandé)

### Installation

```bash
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

### Avec Docker Compose

```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f backend

# Arrêter
docker-compose down
```

## 📁 Structure du Projet

```
backend/
├── src/
│   ├── config/          # Configuration (DB, Redis, env)
│   ├── middleware/      # Middleware Express
│   ├── routes/          # Routes API
│   ├── services/        # Services métier
│   ├── socket/          # Socket.IO server
│   ├── utils/           # Utilitaires
│   └── server.ts        # Point d'entrée
├── prisma/
│   ├── schema.prisma    # Schéma Prisma
│   └── migrations/      # Migrations DB
├── .env.example         # Exemple de configuration
└── package.json
```

## 🔧 Scripts Disponibles

```bash
# Développement
npm run dev              # Démarrer avec hot-reload

# Build
npm run build            # Compiler TypeScript
npm start                # Démarrer la production

# Prisma
npm run prisma:generate  # Générer le client Prisma
npm run prisma:migrate   # Lancer les migrations
npm run prisma:studio    # Ouvrir Prisma Studio
npm run prisma:push      # Push le schéma (dev)

# Tests
npm test                 # Lancer les tests
npm run test:coverage    # Tests avec couverture

# Linting
npm run lint             # Vérifier le code
```

## 📡 Endpoints API

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

### Profils
- `GET /api/profiles/:userId` - Profil utilisateur
- `PUT /api/profiles/:userId` - Mettre à jour le profil

### Collections
- `GET /api/collections` - Mes collections
- `POST /api/collections` - Créer une collection
- `GET /api/collections/:id` - Détails
- `PUT /api/collections/:id` - Mettre à jour
- `DELETE /api/collections/:id` - Supprimer

### Notifications
- `GET /api/notifications` - Mes notifications
- `PUT /api/notifications/:id/read` - Marquer comme lue
- `PUT /api/notifications/read-all` - Tout marquer comme lu

### Analytics
- `POST /api/analytics/track` - Enregistrer un événement
- `GET /api/analytics/stats` - Statistiques
- `GET /api/analytics/popular-resources` - Ressources populaires

### Admin
- `GET /api/admin/stats` - Statistiques admin
- `GET /api/admin/suggestions/pending` - Suggestions en attente
- `PUT /api/admin/suggestions/:id/approve` - Approuver

### Migration
- `POST /api/migration/validate` - Valider les données
- `POST /api/migration/import` - Importer depuis localStorage

### Health & Metrics
- `GET /health` - Health check
- `GET /metrics` - Métriques Prometheus

## 🔐 Authentification

L'API utilise JWT avec refresh tokens stockés dans Redis.

### Headers requis

```
Authorization: Bearer <access_token>
```

### Refresh Token

```json
POST /api/auth/refresh
{
  "refresh_token": "<refresh_token>"
}
```

## 📊 Monitoring

### Métriques Prometheus

Les métriques sont disponibles sur `/metrics` :

- `http_requests_total` - Total requêtes HTTP
- `http_request_duration_seconds` - Latence
- `http_errors_total` - Erreurs HTTP
- `cache_hits_total` / `cache_misses_total` - Cache
- `websocket_connections` - Connexions WebSocket
- `queue_jobs_total` - Jobs de queue

### Health Check

```bash
curl http://localhost:3001/health
```

## 🧪 Tests

```bash
# Tous les tests
npm test

# Avec couverture
npm run test:coverage

# Tests spécifiques
npm test -- authService
npm test -- resources
```

## 🔄 WebSocket

Le serveur Socket.IO est disponible sur le même port que l'API.

### Événements Client → Serveur

- `subscribe` - S'abonner à un channel
- `unsubscribe` - Se désabonner
- `subscribe:resource` - S'abonner aux mises à jour d'une ressource
- `subscribe:suggestions` - S'abonner aux votes de suggestions

### Événements Serveur → Client

- `notification` - Nouvelle notification
- `resource:update` - Mise à jour de ressource
- `suggestion:vote` - Vote sur suggestion

## 🗄️ Base de Données

### Prisma

Le schéma est défini dans `prisma/schema.prisma`.

```bash
# Créer une migration
npm run prisma:migrate

# Appliquer les migrations
npx prisma migrate deploy

# Ouvrir Prisma Studio
npm run prisma:studio
```

## 🔴 Redis

Redis est utilisé pour :

- **Cache** : Mise en cache des requêtes fréquentes
- **Sessions** : Stockage des refresh tokens
- **Rate Limiting** : Limitation du taux de requêtes
- **Pub/Sub** : Notifications en temps réel
- **Queues** : BullMQ pour les tâches asynchrones

## 📝 Logging

Les logs sont gérés par Winston et configurés via `LOG_LEVEL` :

- `error` - Erreurs uniquement
- `warn` - Avertissements et erreurs
- `info` - Informations générales (défaut)
- `debug` - Debug complet

## 🚨 Rate Limiting

- **Général** : 100 requêtes / 15 minutes (par IP ou utilisateur)
- **Auth** : 5 tentatives / 15 minutes (par IP)
- **Admin** : 10 requêtes / minute

## 🔒 Sécurité

- Helmet.js pour les headers de sécurité
- CORS configuré
- Validation Zod pour toutes les entrées
- Rate limiting sur tous les endpoints
- JWT avec expiration
- Refresh tokens dans Redis

## 📚 Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Guide de déploiement](./docs/DEPLOYMENT.md)
- [Guide de migration](./docs/migration-guide.md)

## 🤝 Contribution

1. Créer une branche
2. Faire les modifications
3. Ajouter des tests
4. Créer une PR

## 📄 Licence

MIT

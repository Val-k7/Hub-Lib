# Architecture Finale - Hub-Lib

**Version** : 1.0.0  
**Date** : 2024

---

## 📐 Vue d'Ensemble

Hub-Lib est une application web moderne pour la gestion de ressources, migrée d'un système basé sur `localStorage` vers une architecture complète avec PostgreSQL, Redis et un backend API Node.js.

---

## 🏗️ Architecture Générale

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx (Reverse Proxy)                 │
│                    Ports: 80 (HTTP), 443 (HTTPS)            │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼────────┐            ┌─────────▼──────────┐
│   Frontend     │            │    Backend API    │
│   (React/Vite) │            │   (Node.js/Express)│
│   Port: 8080   │            │   Port: 3001     │
└────────────────┘            └─────────┬─────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
            ┌───────▼──────┐    ┌───────▼──────┐   ┌────────▼────────┐
            │  PostgreSQL  │    │    Redis     │   │   Socket.IO     │
            │  Port: 5432  │    │  Port: 6379   │   │  (WebSockets)   │
            └──────────────┘    └──────────────┘   └─────────────────┘
```

---

## 🔧 Composants Principaux

### 1. Frontend (React + Vite + TypeScript)

**Technologies** :
- React 18
- Vite (build tool)
- TypeScript
- TanStack Query (state management)
- Socket.IO Client (temps réel)

**Responsabilités** :
- Interface utilisateur
- Gestion de l'état client
- Communication avec le backend API
- WebSocket pour notifications temps réel

**Client API** :
- `ApiClient` : Client HTTP pour les requêtes REST
- `WebSocketService` : Client Socket.IO pour temps réel
- `QueryBuilder` : Interface compatible avec LocalClient

### 2. Backend API (Node.js + Express + TypeScript)

**Technologies** :
- Node.js 20+
- Express.js
- TypeScript
- Prisma (ORM)
- Socket.IO (WebSockets)
- BullMQ (queues)

**Responsabilités** :
- API REST pour toutes les opérations
- Authentification JWT
- Gestion des sessions
- WebSocket server
- Traitement asynchrone (queues)

**Services Principaux** :
- `authService` : Authentification
- `notificationService` : Notifications
- `cacheService` : Cache Redis
- `voteService` : Votes temps réel
- `queueService` : Queues de tâches
- `sessionService` : Sessions utilisateurs

### 3. PostgreSQL (Base de Données)

**Version** : PostgreSQL 16

**Responsabilités** :
- Stockage persistant de toutes les données
- Relations entre entités
- Contraintes d'intégrité
- Index pour performance

**Tables Principales** :
- `profiles` : Profils utilisateurs
- `resources` : Ressources
- `collections` : Collections
- `notifications` : Notifications
- `category_tag_suggestions` : Suggestions
- `suggestion_votes` : Votes
- Et 13 autres tables...

### 4. Redis (Cache et Services)

**Version** : Redis 7

**Responsabilités** :
- Cache des données fréquemment accédées
- Sessions utilisateurs
- Rate limiting
- Pub/Sub pour temps réel
- Queues de tâches (BullMQ)

**Utilisations** :
- Cache avec TTL
- Sessions JWT
- Pub/Sub notifications
- Pub/Sub votes
- Queues asynchrones

### 5. Socket.IO (Temps Réel)

**Responsabilités** :
- Notifications temps réel
- Synchronisation votes
- Mises à jour ressources
- Communication bidirectionnelle

**Architecture** :
- Redis Adapter pour multi-instances
- Rooms par utilisateur
- Authentification JWT

### 6. Nginx (Reverse Proxy)

**Responsabilités** :
- Reverse proxy pour frontend et backend
- SSL/TLS termination
- Load balancing (si multi-instances)
- Compression
- Cache statique

---

## 🔄 Flux de Données

### Authentification

```
1. User → Frontend : Email + Password
2. Frontend → Backend : POST /api/auth/signin
3. Backend → PostgreSQL : Vérifier credentials
4. Backend → Redis : Stocker session
5. Backend → Frontend : JWT tokens
6. Frontend : Stocker tokens (localStorage)
```

### Création de Ressource

```
1. User → Frontend : Formulaire ressource
2. Frontend → Backend : POST /api/resources
3. Backend → PostgreSQL : Insérer ressource
4. Backend → Redis : Invalider cache
5. Backend → Redis Pub/Sub : Publier mise à jour
6. Socket.IO → Frontend : Notification temps réel
7. Backend → Frontend : Réponse avec ressource créée
```

### Notification Temps Réel

```
1. Backend → notificationService.createNotification()
2. Backend → PostgreSQL : Insérer notification
3. Backend → Redis Pub/Sub : Publier sur canal user:${userId}
4. Socket.IO Server : Recevoir publication Redis
5. Socket.IO Server → Client : Emit 'notification'
6. Frontend : Recevoir et afficher notification
```

---

## 🔐 Sécurité

### Authentification
- JWT avec access token (7 jours) et refresh token (30 jours)
- Tokens stockés dans localStorage (frontend)
- Sessions stockées dans Redis (backend)
- Rate limiting sur les endpoints d'authentification

### Autorisation
- Middleware `authMiddleware` pour routes protégées
- Middleware `requireRole` pour rôles (admin/user)
- Middleware `requireOwnership` pour propriété

### Validation
- Zod pour validation des schémas
- Validation des entrées utilisateur
- Sanitization des données

### HTTPS
- SSL/TLS via Nginx
- Certificats Let's Encrypt (production)

---

## 📊 Performance

### Cache Strategy
- Cache Redis avec TTL intelligent
- Invalidation ciblée par tags
- Invalidation en cascade

### Base de Données
- Index sur colonnes fréquemment requêtées
- Index GIN pour arrays (tags)
- Requêtes optimisées avec Prisma

### WebSocket
- Redis Adapter pour scaling horizontal
- Rooms pour cibler les utilisateurs
- Reconnexion automatique

---

## 🚀 Scaling

### Horizontal Scaling
- Backend : Multi-instances avec load balancer
- Redis : Cluster mode (si nécessaire)
- PostgreSQL : Read replicas (si nécessaire)

### Vertical Scaling
- Augmenter ressources CPU/RAM des conteneurs
- Optimiser les requêtes PostgreSQL
- Ajuster les pools de connexions

---

## 📦 Déploiement

### Docker Compose
- Services containerisés
- Health checks
- Volumes persistants
- Networks isolés

### Production
- Variables d'environnement sécurisées
- Backups automatiques PostgreSQL
- Persistance Redis (RDB + AOF)
- Monitoring avec Prometheus/Grafana

---

## 🔍 Monitoring

### Métriques à Surveiller
- CPU, mémoire, disque des conteneurs
- Connexions PostgreSQL
- Utilisation mémoire Redis
- Latence des requêtes API
- Taux d'erreurs
- Hit/miss ratio du cache

### Outils
- Prometheus : Collecte de métriques
- Grafana : Visualisation
- Winston : Logging structuré
- Health checks : Endpoints `/health`

---

## 📚 Documentation

- `docs/deployment.md` : Guide de déploiement
- `docs/monitoring.md` : Guide de monitoring
- `docs/api.md` : Documentation API
- `docs/migration-guide.md` : Guide de migration
- `roadmap.md` : Roadmap complet

---

## 🔄 Migration depuis localStorage

### Stratégie
1. **Mode Hybride** : LocalClient et ApiClient en parallèle
2. **Feature Flag** : `VITE_USE_API_CLIENT` pour basculer
3. **Migration Progressive** : Service par service
4. **Migration Données** : Scripts d'export/import

### État Actuel
- ✅ 100% des services migrés
- ✅ Backend API complet
- ✅ WebSockets opérationnels
- ✅ Migration des données possible

---

**Architecture finale validée et documentée ! 🎉**



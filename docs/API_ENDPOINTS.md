# 📚 Documentation API - Tous les Endpoints

**Version** : 1.0.0  
**Base URL** : `/api`

## 🔐 Authentification

Tous les endpoints (sauf mention contraire) nécessitent un header :
```
Authorization: Bearer <access_token>
```

### Refresh Token
Pour rafraîchir les tokens expirés :
```
POST /api/auth/refresh
Body: { "refreshToken": "..." }
```

---

## 📋 Endpoints par Catégorie

### 🔑 Authentification (5 endpoints)

#### Inscription
```http
POST /api/auth/signup
Body: {
  "email": "user@example.com",
  "password": "password123",
  "username": "username" (optionnel),
  "fullName": "Full Name" (optionnel)
}
```

#### Connexion
```http
POST /api/auth/signin
Body: {
  "email": "user@example.com",
  "password": "password123"
}
Response: {
  "user": { ... },
  "tokens": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 604800
  }
}
```

#### Déconnexion
```http
POST /api/auth/signout
Body: { "refreshToken": "..." }
```

#### Rafraîchir les tokens
```http
POST /api/auth/refresh
Body: { "refreshToken": "..." }
```

#### Session actuelle
```http
GET /api/auth/session
Headers: Authorization: Bearer <token>
```

---

### 📦 Ressources (8 endpoints)

#### Liste des ressources
```http
GET /api/resources?page=1&limit=20&category=...&tags=...&search=...
Query params:
  - page: number (défaut: 1)
  - limit: number (défaut: 20, max: 100)
  - search: string
  - category: string
  - tags: string[]
  - authorId: UUID
  - language: string
  - visibility: 'public' | 'private' | 'shared_users' | 'shared_groups'
  - resourceType: 'file_upload' | 'external_link' | 'github_repo'
  - sortBy: 'created_at' | 'updated_at' | 'views_count' | 'downloads_count' | 'average_rating'
  - sortOrder: 'asc' | 'desc'
```

#### Détails d'une ressource
```http
GET /api/resources/:id
```

#### Créer une ressource
```http
POST /api/resources
Headers: Authorization: Bearer <token>
Body: {
  "title": "Titre de la ressource",
  "description": "Description",
  "category": "Catégorie",
  "tags": ["tag1", "tag2"],
  "resourceType": "external_link",
  "visibility": "public",
  "externalUrl": "https://...",
  "language": "JavaScript",
  "readme": "..."
}
```

#### Mettre à jour une ressource
```http
PUT /api/resources/:id
Headers: Authorization: Bearer <token>
Body: { ... } (champs partiels)
```

#### Supprimer une ressource
```http
DELETE /api/resources/:id
Headers: Authorization: Bearer <token>
```

#### Incrémenter les vues
```http
POST /api/resources/:id/view
```

#### Incrémenter les téléchargements
```http
POST /api/resources/:id/download
```

#### Fork une ressource
```http
POST /api/resources/:id/fork
Headers: Authorization: Bearer <token>
```

---

### 👤 Profils (5 endpoints)

#### Profil d'un utilisateur
```http
GET /api/profiles/:id
```

#### Ressources d'un utilisateur
```http
GET /api/profiles/:id/resources?page=1&limit=20
```

#### Statistiques d'un utilisateur
```http
GET /api/profiles/:id/stats
Response: {
  "resources": { "total": 10, "public": 8, "private": 2 },
  "views": 1500,
  "downloads": 500,
  "ratings": { "total": 20, "average": 4.5 },
  "savedCount": 5
}
```

#### Collections d'un utilisateur
```http
GET /api/profiles/:id/collections
```

#### Mettre à jour son profil
```http
PUT /api/profiles/:id
Headers: Authorization: Bearer <token>
Body: {
  "username": "nouveau_username",
  "fullName": "Nouveau Nom",
  "bio": "Biographie",
  "avatarUrl": "https://...",
  "githubUsername": "githubuser"
}
```

---

### 📚 Collections (7 endpoints)

#### Liste des collections
```http
GET /api/collections?userId=...&page=1&limit=20
```

#### Détails d'une collection
```http
GET /api/collections/:id
```

#### Créer une collection
```http
POST /api/collections
Headers: Authorization: Bearer <token>
Body: {
  "name": "Ma Collection",
  "description": "Description",
  "isPublic": false,
  "coverImageUrl": "https://..."
}
```

#### Mettre à jour une collection
```http
PUT /api/collections/:id
Headers: Authorization: Bearer <token>
```

#### Supprimer une collection
```http
DELETE /api/collections/:id
Headers: Authorization: Bearer <token>
```

#### Ajouter une ressource à une collection
```http
POST /api/collections/:id/resources
Headers: Authorization: Bearer <token>
Body: { "resourceId": "..." }
```

#### Retirer une ressource d'une collection
```http
DELETE /api/collections/:id/resources/:resourceId
Headers: Authorization: Bearer <token>
```

---

### 💬 Commentaires (4 endpoints)

#### Commentaires d'une ressource
```http
GET /api/comments/resource/:resourceId
Response: {
  "data": [
    {
      "id": "...",
      "content": "...",
      "profile": { ... },
      "replies": [ ... ] // Commentaires imbriqués
    }
  ],
  "total": 10
}
```

#### Créer un commentaire
```http
POST /api/comments
Headers: Authorization: Bearer <token>
Body: {
  "resourceId": "...",
  "content": "Contenu du commentaire",
  "parentId": "..." (optionnel, pour répondre)
}
```

#### Mettre à jour un commentaire
```http
PUT /api/comments/:id
Headers: Authorization: Bearer <token>
Body: { "content": "Nouveau contenu" }
```

#### Supprimer un commentaire
```http
DELETE /api/comments/:id
Headers: Authorization: Bearer <token>
```

---

### 👥 Groupes (8 endpoints)

#### Liste des groupes (mes groupes)
```http
GET /api/groups
Headers: Authorization: Bearer <token>
```

#### Détails d'un groupe
```http
GET /api/groups/:id
Headers: Authorization: Bearer <token>
```

#### Créer un groupe
```http
POST /api/groups
Headers: Authorization: Bearer <token>
Body: {
  "name": "Mon Groupe",
  "description": "Description"
}
```

#### Mettre à jour un groupe
```http
PUT /api/groups/:id
Headers: Authorization: Bearer <token>
```

#### Supprimer un groupe
```http
DELETE /api/groups/:id
Headers: Authorization: Bearer <token>
```

#### Ajouter un membre
```http
POST /api/groups/:id/members
Headers: Authorization: Bearer <token>
Body: {
  "userId": "...",
  "role": "member" | "admin"
}
```

#### Retirer un membre
```http
DELETE /api/groups/:id/members/:userId
Headers: Authorization: Bearer <token>
```

#### Ressources partagées avec un groupe
```http
GET /api/groups/:id/resources
Headers: Authorization: Bearer <token>
```

---

### 🔔 Notifications (5 endpoints)

#### Liste des notifications
```http
GET /api/notifications?isRead=true&type=...&page=1&limit=20
Headers: Authorization: Bearer <token>
Response: {
  "data": [ ... ],
  "meta": {
    "total": 10,
    "unreadCount": 5,
    "page": 1,
    "limit": 20
  }
}
```

#### Nombre de notifications non lues
```http
GET /api/notifications/unread-count
Headers: Authorization: Bearer <token>
```

#### Marquer comme lue
```http
PUT /api/notifications/:id/read
Headers: Authorization: Bearer <token>
```

#### Tout marquer comme lu
```http
PUT /api/notifications/read-all
Headers: Authorization: Bearer <token>
```

#### Supprimer une notification
```http
DELETE /api/notifications/:id
Headers: Authorization: Bearer <token>
```

---

### ⚙️ Administration (9 endpoints)

**Tous les endpoints admin nécessitent le rôle `admin`**

#### Statistiques globales
```http
GET /api/admin/stats
Headers: Authorization: Bearer <admin_token>
```

#### Configuration admin
```http
GET /api/admin/config
PUT /api/admin/config/:key
Body: {
  "value": ...,
  "description": "..."
}
```

#### Suggestions à modérer
```http
GET /api/admin/suggestions?status=pending&type=category&page=1
```

#### Approuver une suggestion
```http
PUT /api/admin/suggestions/:id/approve
```

#### Rejeter une suggestion
```http
PUT /api/admin/suggestions/:id/reject
```

#### Liste des utilisateurs
```http
GET /api/admin/users?search=...&page=1&limit=20
```

#### Modifier le rôle d'un utilisateur
```http
PUT /api/admin/users/:id/role
Body: { "role": "admin" | "user" }
```

---

### 💡 Suggestions et Votes (5 endpoints)

#### Liste des suggestions
```http
GET /api/suggestions?type=category&status=approved&page=1&limit=20
Query params:
  - type: 'category' | 'tag' | 'resource_type' | 'filter'
  - status: 'pending' | 'approved' | 'rejected'
  - page: number
  - limit: number
  - sortBy: 'votes_count' | 'created_at'
  - sortOrder: 'asc' | 'desc'
```

#### Détails d'une suggestion
```http
GET /api/suggestions/:id
```

#### Créer une suggestion
```http
POST /api/suggestions
Headers: Authorization: Bearer <token>
Body: {
  "name": "Nouvelle catégorie",
  "description": "Description",
  "type": "category"
}
```

#### Voter sur une suggestion
```http
POST /api/suggestions/:id/vote
Headers: Authorization: Bearer <token>
Body: {
  "voteType": "upvote" | "downvote"
}
Note: Voter deux fois de la même manière supprime le vote
```

#### Supprimer son vote
```http
DELETE /api/suggestions/:id/vote
Headers: Authorization: Bearer <token>
```

---

## 🔴 Codes d'Erreur

- `AUTH_TOKEN_MISSING` - Token d'authentification manquant
- `AUTH_TOKEN_INVALID` - Token invalide ou expiré
- `AUTH_REQUIRED` - Authentification requise
- `NOT_OWNER` - Vous n'êtes pas propriétaire de la ressource
- `ACCESS_DENIED` - Accès refusé
- `RESOURCE_NOT_FOUND` - Ressource non trouvée
- `VALIDATION_ERROR` - Erreur de validation des données
- `DUPLICATE_ENTRY` - Ressource déjà existante
- `RATE_LIMIT_EXCEEDED` - Trop de requêtes
- `INSUFFICIENT_ROLE` - Rôle insuffisant

---

## 📊 Rate Limiting

- **Authentification** : 5 requêtes / 15 minutes par IP
- **Général** : 100 requêtes / 15 minutes par utilisateur/IP
- **Admin** : 10 requêtes / minute par utilisateur

Headers de réponse :
- `X-RateLimit-Limit` - Limite max
- `X-RateLimit-Remaining` - Requêtes restantes
- `X-RateLimit-Reset` - Date de réinitialisation

---

## 💾 Cache

Les endpoints suivants sont mis en cache dans Redis :
- Liste des ressources publiques (5 min)
- Profils utilisateurs (30 min)
- Statistiques (15 min)
- Suggestions approuvées (1h)

Le cache est invalidé automatiquement lors des modifications.

---

## 🔐 Sécurité

- JWT avec expiration (7 jours)
- Refresh tokens (30 jours)
- Sessions stockées dans Redis
- Rate limiting avec Redis
- Validation des données avec Zod
- Vérification de propriété pour les modifications
- Gestion de la visibilité des ressources

---

**Total : 54+ endpoints API documentés ! 🎉**




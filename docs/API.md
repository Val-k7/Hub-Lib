# API REST - Documentation

Cette documentation décrit l'API REST de Hub-Lib pour les intégrations externes.

## Authentification

L'API utilise l'authentification par token. Pour obtenir un token :

1. Connectez-vous à votre compte
2. Allez dans **Paramètres API** (`/api-settings`)
3. Créez un nouveau token
4. Utilisez ce token dans l'en-tête `Authorization` de vos requêtes

### Format d'authentification

```
Authorization: Bearer YOUR_TOKEN_HERE
```

## Rate Limiting

- **Limite** : 100 requêtes par minute par token
- **En-tête de réponse** : `X-RateLimit-Remaining` (nombre de requêtes restantes)

## Endpoints

### Base URL

```
/api/v1
```

### GET /resources

Récupère une liste de ressources.

**Paramètres de requête :**
- `page` (number, optionnel) : Numéro de page (défaut: 1)
- `per_page` (number, optionnel) : Nombre de résultats par page (défaut: 20)
- `category` (string, optionnel) : Filtrer par catégorie
- `tags` (string[], optionnel) : Filtrer par tags (séparés par des virgules)
- `search` (string, optionnel) : Recherche dans titre, description et tags
- `user_id` (string, optionnel) : Filtrer par utilisateur

**Exemple :**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-domain.com/api/v1/resources?page=1&per_page=20&category=Code%20%26%20Scripts"
```

**Réponse :**
```json
{
  "data": [
    {
      "id": "resource-id",
      "title": "Titre de la ressource",
      "description": "Description...",
      "category": "Code & Scripts",
      "tags": ["react", "typescript"],
      "user_id": "user-id",
      "created_at": "2024-01-01T00:00:00.000Z",
      "profiles": {
        "username": "username",
        "full_name": "Full Name"
      }
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 20
  }
}
```

### GET /resources/:id

Récupère une ressource spécifique.

**Exemple :**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-domain.com/api/v1/resources/resource-id"
```

**Réponse :**
```json
{
  "data": {
    "id": "resource-id",
    "title": "Titre de la ressource",
    "description": "Description...",
    "category": "Code & Scripts",
    "tags": ["react", "typescript"],
    "github_url": "https://github.com/...",
    "readme": "# README\n...",
    "profiles": {
      "username": "username",
      "full_name": "Full Name"
    }
  }
}
```

### POST /resources

Crée une nouvelle ressource.

**Corps de la requête :**
```json
{
  "title": "Titre de la ressource",
  "description": "Description de la ressource",
  "category": "Code & Scripts",
  "tags": ["react", "typescript"],
  "github_url": "https://github.com/...",
  "readme": "# README\n...",
  "visibility": "public"
}
```

**Exemple :**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Ma ressource","description":"Description","category":"Code & Scripts","tags":["react"],"visibility":"public"}' \
  "https://your-domain.com/api/v1/resources"
```

### PUT /resources/:id

Met à jour une ressource existante.

**Corps de la requête :**
```json
{
  "title": "Nouveau titre",
  "description": "Nouvelle description"
}
```

**Exemple :**
```bash
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Nouveau titre"}' \
  "https://your-domain.com/api/v1/resources/resource-id"
```

### DELETE /resources/:id

Supprime une ressource.

**Exemple :**
```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-domain.com/api/v1/resources/resource-id"
```

### GET /users/:id

Récupère les informations d'un utilisateur.

**Exemple :**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-domain.com/api/v1/users/user-id"
```

### GET /stats

Récupère les statistiques globales.

**Exemple :**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-domain.com/api/v1/stats"
```

**Réponse :**
```json
{
  "data": {
    "total_resources": 1000,
    "total_users": 100,
    "total_events": 5000,
    "events_by_type": {
      "resource_view": 3000,
      "resource_download": 2000
    }
  }
}
```

## Codes d'erreur

- `RESOURCE_NOT_FOUND` : Ressource introuvable
- `RESOURCE_CREATE_ERROR` : Erreur lors de la création
- `RESOURCE_UPDATE_ERROR` : Erreur lors de la mise à jour
- `RESOURCE_DELETE_ERROR` : Erreur lors de la suppression
- `UNAUTHORIZED` : Non autorisé
- `USER_NOT_FOUND` : Utilisateur introuvable
- `STATS_ERROR` : Erreur lors de la récupération des statistiques
- `RATE_LIMIT_EXCEEDED` : Limite de requêtes dépassée

## Exemples d'utilisation

### JavaScript/TypeScript

```typescript
const API_BASE = 'https://your-domain.com/api/v1';
const TOKEN = 'your-token-here';

async function getResources() {
  const response = await fetch(`${API_BASE}/resources`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
    },
  });
  const data = await response.json();
  return data;
}

async function createResource(resourceData: any) {
  const response = await fetch(`${API_BASE}/resources`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resourceData),
  });
  const data = await response.json();
  return data;
}
```

### Python

```python
import requests

API_BASE = 'https://your-domain.com/api/v1'
TOKEN = 'your-token-here'

headers = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json',
}

# Récupérer les ressources
response = requests.get(f'{API_BASE}/resources', headers=headers)
data = response.json()

# Créer une ressource
resource_data = {
    'title': 'Ma ressource',
    'description': 'Description',
    'category': 'Code & Scripts',
    'tags': ['react', 'typescript'],
    'visibility': 'public',
}
response = requests.post(
    f'{API_BASE}/resources',
    headers=headers,
    json=resource_data
)
data = response.json()
```

## Notes

- Tous les endpoints nécessitent une authentification (sauf mention contraire)
- Les dates sont au format ISO 8601
- Les réponses sont au format JSON
- Les erreurs sont retournées avec un code et un message descriptif



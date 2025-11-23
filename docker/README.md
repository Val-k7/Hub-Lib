# Docker Setup pour Hub-Lib

Cette architecture Docker permet de déployer Hub-Lib avec :
- **PostgreSQL** : Base de données principale pour stocker toutes les données
- **Redis** : Cache et gestion des états en temps réel
- **Backend** : API Node.js (à créer)
- **Frontend** : Application React/Vite

## Prérequis

- Docker et Docker Compose installés
- Ports 5432 (PostgreSQL), 6379 (Redis), 3001 (Backend), 8080 (Frontend) disponibles

## Démarrage

```bash
# Lancer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter tous les services
docker-compose down

# Arrêter et supprimer les volumes (ATTENTION: supprime les données)
docker-compose down -v
```

## Services

### PostgreSQL
- **Port** : 5432
- **Database** : hub_lib
- **User** : hub_lib_user
- **Password** : hub_lib_password
- **Volume** : postgres_data (persistance des données)

### Redis
- **Port** : 6379
- **Volume** : redis_data (persistance des données)
- Utilisé pour :
  - Cache des requêtes fréquentes
  - Sessions utilisateurs
  - États en temps réel (votes, suggestions)
  - Queue de tâches

### Backend (à créer)
- **Port** : 3001
- API REST/GraphQL pour :
  - Authentification
  - Gestion des ressources
  - Système de votes
  - Administration

### Frontend
- **Port** : 8080
- Application React/Vite
- Connectée au backend via API

## Migration depuis localStorage

Pour migrer les données existantes de localStorage vers PostgreSQL :

1. Exporter les données depuis localStorage
2. Créer un script de migration dans `docker/migrations/`
3. Exécuter le script lors du démarrage du backend

## Configuration Redis

Redis est utilisé pour :
- **Cache** : Mettre en cache les requêtes fréquentes (catégories, tags, ressources populaires)
- **Sessions** : Gérer les sessions utilisateurs
- **Votes en temps réel** : Synchroniser les votes entre utilisateurs
- **Queue** : Traiter les tâches asynchrones (approbations automatiques)

## Variables d'environnement

Créer un fichier `.env` à la racine :

```env
POSTGRES_DB=hub_lib
POSTGRES_USER=hub_lib_user
POSTGRES_PASSWORD=hub_lib_password
REDIS_URL=redis://redis:6379
DATABASE_URL=postgresql://hub_lib_user:hub_lib_password@postgres:5432/hub_lib
```


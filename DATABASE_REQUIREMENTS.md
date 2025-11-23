# 🗄️ Pourquoi PostgreSQL et Redis sont Nécessaires

## 📊 État Actuel vs Production

### État Actuel (Développement)
- **Stockage** : `localStorage` dans le navigateur
- **Limitations** :
  - Limite de 5-10MB par domaine
  - Données isolées par navigateur/utilisateur
  - Pas de partage entre utilisateurs
  - Pas de persistance réelle (effacé si cache nettoyé)
  - Pas de sécurité (données côté client)

### Production Nécessite

#### 🐘 PostgreSQL - Base de Données Principale

**Pourquoi ?**
1. **Partage de données** : Les ressources doivent être accessibles par tous les utilisateurs
2. **Persistance réelle** : Les données doivent survivre aux nettoyages de cache
3. **Sécurité** : Les données sensibles doivent être côté serveur
4. **Scalabilité** : Gérer des milliers d'utilisateurs et ressources
5. **Relations complexes** : Gérer les relations entre utilisateurs, ressources, groupes, etc.
6. **Requêtes avancées** : Recherche full-text, filtres complexes, statistiques

**Tables préparées** (voir `docker/postgres/init.sql`) :
- `profiles` - Profils utilisateurs
- `resources` - Ressources partagées
- `resource_ratings` - Notes des ressources
- `resource_shares` - Partages de ressources
- `groups` - Groupes d'utilisateurs
- `notifications` - Notifications
- `category_tag_suggestions` - Suggestions de catégories/tags
- `suggestion_votes` - Votes sur les suggestions
- `user_roles` - Rôles utilisateurs (admin/user)
- `admin_configs` - Configuration admin

#### 🔴 Redis - Cache et Sessions

**Pourquoi ?**
1. **Performance** : Cache des requêtes fréquentes (catégories, tags, ressources populaires)
2. **Sessions utilisateurs** : Gérer les sessions de manière scalable
3. **Notifications temps réel** : Pub/Sub pour les notifications instantanées
4. **Queue de tâches** : Traiter les tâches asynchrones (approbations automatiques)
5. **Rate limiting** : Limiter les requêtes par utilisateur
6. **Votes en temps réel** : Synchroniser les votes entre utilisateurs

**Utilisations prévues** :
- Cache des catégories et tags (TTL: 1h)
- Cache des ressources populaires (TTL: 15min)
- Sessions utilisateurs (TTL: 7 jours)
- Queue pour les notifications
- Pub/Sub pour les mises à jour en temps réel

## 🏗️ Architecture Cible

```
┌─────────────────┐
│   Nginx (80/443)│
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────┐
│Frontend│ │ Backend │ ← À implémenter
└────────┘ └────┬────┘
                │
        ┌───────┴───────┐
        │               │
    ┌───▼────┐    ┌────▼───┐
    │PostgreSQL│    │ Redis  │
    └─────────┘    └────────┘
```

## 📝 Migration Future

L'application utilise actuellement `localClient` qui simule l'API Supabase avec localStorage. Pour migrer vers PostgreSQL :

1. **Créer le backend API** (Node.js/Express, Python/FastAPI, etc.)
2. **Remplacer `localClient`** par un client API réel
3. **Migrer les données** : Script d'export depuis localStorage et import dans PostgreSQL
4. **Implémenter Redis** : Cache et sessions dans le backend

## 🚀 Déploiement Actuel

Même sans backend, PostgreSQL et Redis sont déployés et prêts :

```bash
# Démarrer tous les services
docker compose --env-file .env.production up -d

# Vérifier l'état
docker compose ps

# Logs
docker compose logs -f postgres
docker compose logs -f redis
```

## 🔐 Sécurité

- **PostgreSQL** : Mot de passe fort requis (défini dans `.env.production`)
- **Redis** : Authentification par mot de passe (défini dans `.env.production`)
- **Volumes** : Données persistantes dans des volumes Docker
- **Réseau** : Services isolés dans un réseau Docker privé

## 📊 Monitoring

```bash
# Vérifier la santé de PostgreSQL
docker exec hub-lib-postgres pg_isready -U hub_lib_user

# Vérifier Redis
docker exec hub-lib-redis redis-cli -a $REDIS_PASSWORD ping

# Statistiques
docker stats hub-lib-postgres hub-lib-redis
```

## 💾 Sauvegarde

Les volumes Docker persistent les données :
- `postgres_data` : Toutes les données PostgreSQL
- `redis_data` : Cache et données Redis

Pour sauvegarder :
```bash
# PostgreSQL
docker exec hub-lib-postgres pg_dump -U hub_lib_user hub_lib > backup.sql

# Redis
docker exec hub-lib-redis redis-cli -a $REDIS_PASSWORD SAVE
```


# Guide de Déploiement - Hub-Lib

**Version** : 1.0.0  
**Date** : 2024

---

## 📋 Prérequis

- Docker et Docker Compose installés
- Au moins 4GB de RAM disponible
- 20GB d'espace disque libre
- Ports 80, 443, 3001 disponibles (ou configurés différemment)

---

## 🚀 Déploiement Rapide

### 1. Cloner le Repository

```bash
git clone <repository-url>
cd Hub-Lib
```

### 2. Configurer les Variables d'Environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer les variables critiques
nano .env
```

**Variables essentielles** :
```env
# PostgreSQL
POSTGRES_PASSWORD=<mot-de-passe-fort>
POSTGRES_DB=hub_lib
POSTGRES_USER=hub_lib_user

# Redis
REDIS_PASSWORD=<mot-de-passe-fort>

# JWT
JWT_SECRET=<secret-aléatoire-très-long>
JWT_REFRESH_SECRET=<secret-aléatoire-très-long-différent>

# CORS
CORS_ORIGIN=https://votre-domaine.com,https://www.votre-domaine.com

# Frontend
VITE_API_URL=https://api.votre-domaine.com
```

### 3. Construire et Démarrer

```bash
# Construire les images
docker-compose build

# Démarrer les services
docker-compose up -d

# Vérifier les logs
docker-compose logs -f
```

### 4. Initialiser la Base de Données

```bash
# Générer le client Prisma
cd backend
npm run prisma:generate

# Appliquer les migrations
npm run prisma:migrate

# Ou push le schéma (développement)
npm run prisma:push
```

### 5. Vérifier le Déploiement

```bash
# Health check
curl http://localhost/health

# Vérifier les services
docker-compose ps
```

---

## 🔧 Configuration Détaillée

### PostgreSQL

**Backups Automatiques** :

Créer un script de backup :
```bash
#!/bin/bash
# scripts/backup-postgres.sh

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER="hub-lib-postgres"

mkdir -p $BACKUP_DIR

docker exec $CONTAINER pg_dump -U hub_lib_user hub_lib > $BACKUP_DIR/backup_$DATE.sql

# Garder seulement les 30 derniers backups
ls -t $BACKUP_DIR/backup_*.sql | tail -n +31 | xargs rm -f
```

Ajouter au crontab :
```bash
# Backup quotidien à 2h du matin
0 2 * * * /chemin/vers/scripts/backup-postgres.sh
```

### Redis

**Persistance** :

Le fichier `docker/redis/redis.conf` configure :
- RDB (snapshots) : Sauvegarde toutes les 5 minutes
- AOF (Append Only File) : Persistance de toutes les écritures

**Backup Redis** :
```bash
#!/bin/bash
# scripts/backup-redis.sh

BACKUP_DIR="/backups/redis"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER="hub-lib-redis"

mkdir -p $BACKUP_DIR

docker exec $CONTAINER redis-cli --no-auth-warning -a $REDIS_PASSWORD BGSAVE
docker cp $CONTAINER:/data/dump.rdb $BACKUP_DIR/dump_$DATE.rdb
```

### Nginx

**Configuration SSL** :

1. Obtenir des certificats Let's Encrypt :
```bash
certbot certonly --standalone -d votre-domaine.com -d www.votre-domaine.com
```

2. Configurer Nginx pour HTTPS :
```nginx
server {
    listen 443 ssl http2;
    server_name votre-domaine.com;

    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;

    # ... reste de la config
}
```

---

## 🔐 Sécurité Production

### 1. Variables d'Environnement

- ✅ Ne jamais commiter `.env`
- ✅ Utiliser des secrets forts
- ✅ Rotation régulière des secrets JWT
- ✅ Limiter l'accès au fichier `.env`

### 2. Firewall

```bash
# Autoriser seulement les ports nécessaires
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 3. Rate Limiting

Déjà configuré dans le backend :
- 100 requêtes par 15 minutes par IP
- Limites plus strictes sur `/api/auth/*`

### 4. HTTPS Obligatoire

Rediriger HTTP vers HTTPS dans Nginx :
```nginx
server {
    listen 80;
    server_name votre-domaine.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 📊 Monitoring

### Health Checks

Tous les services ont des health checks :
- PostgreSQL : `pg_isready`
- Redis : `redis-cli ping`
- Backend : `GET /health`
- Frontend : Vérification de disponibilité

### Logs

```bash
# Logs de tous les services
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Métriques

Voir `docs/monitoring.md` pour la configuration Prometheus/Grafana.

---

## 🔄 Mise à Jour

### 1. Sauvegarder les Données

```bash
# Backup PostgreSQL
./scripts/backup-postgres.sh

# Backup Redis
./scripts/backup-redis.sh
```

### 2. Mettre à Jour le Code

```bash
git pull origin main
docker-compose build
docker-compose up -d
```

### 3. Migrations Base de Données

```bash
cd backend
npm run prisma:migrate
```

### 4. Vérifier

```bash
# Health checks
curl http://localhost/health

# Logs
docker-compose logs -f
```

---

## 🚨 Dépannage

### Problème : Services ne démarrent pas

```bash
# Vérifier les logs
docker-compose logs

# Vérifier les variables d'environnement
docker-compose config

# Redémarrer un service
docker-compose restart backend
```

### Problème : Base de données inaccessible

```bash
# Vérifier la connexion
docker exec -it hub-lib-postgres psql -U hub_lib_user -d hub_lib

# Vérifier les logs
docker-compose logs postgres
```

### Problème : Redis inaccessible

```bash
# Vérifier la connexion
docker exec -it hub-lib-redis redis-cli -a $REDIS_PASSWORD ping

# Vérifier les logs
docker-compose logs redis
```

### Problème : Backend ne répond pas

```bash
# Vérifier les logs
docker-compose logs backend

# Vérifier les dépendances
docker-compose ps

# Redémarrer
docker-compose restart backend
```

---

## 📝 Checklist de Déploiement

- [ ] Variables d'environnement configurées
- [ ] Secrets JWT générés
- [ ] Base de données initialisée
- [ ] Backups configurés
- [ ] SSL/TLS configuré
- [ ] Firewall configuré
- [ ] Monitoring configuré
- [ ] Health checks fonctionnels
- [ ] Tests de charge effectués
- [ ] Documentation à jour

---

## 🔗 Ressources

- [Documentation Docker Compose](https://docs.docker.com/compose/)
- [Documentation PostgreSQL](https://www.postgresql.org/docs/)
- [Documentation Redis](https://redis.io/docs/)
- [Documentation Nginx](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)

---

**Guide de déploiement complet ! 🚀**



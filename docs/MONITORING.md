# Guide de Monitoring Hub-Lib

## 📊 Vue d'ensemble

Hub-Lib utilise Prometheus pour la collecte de métriques et Grafana pour la visualisation.

## 🚀 Installation

### 1. Démarrer les services de monitoring

```bash
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

### 2. Accéder aux interfaces

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000
  - Utilisateur: `admin`
  - Mot de passe: défini dans `GRAFANA_ADMIN_PASSWORD` (par défaut: `admin`)

### 3. Configuration Nginx (production)

Ajoutez les routes suivantes dans votre configuration Nginx :

```nginx
# Prometheus (protégé par authentification)
location /prometheus/ {
    auth_basic "Prometheus";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://prometheus:9090/;
}

# Grafana
location /grafana/ {
    proxy_pass http://grafana:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## 📈 Métriques collectées

### Backend API
- Temps de réponse des requêtes
- Taux d'erreur (4xx, 5xx)
- Nombre de requêtes par endpoint
- Utilisation CPU/Mémoire

### Redis
- Utilisation mémoire
- Nombre de clés
- Opérations par seconde
- Connexions actives

### PostgreSQL
- Nombre de connexions
- Requêtes par seconde
- Taille de la base de données
- Performances des requêtes

### Système
- Utilisation CPU
- Utilisation mémoire
- Espace disque
- I/O réseau

## 🚨 Alertes configurées

Les alertes suivantes sont configurées dans `docker/prometheus/alerts.yml` :

- **BackendDown**: Backend inaccessible
- **HighCPUUsage**: CPU > 80%
- **HighMemoryUsage**: Mémoire > 85%
- **LowDiskSpace**: Espace disque < 15%
- **RedisDown**: Redis inaccessible
- **PostgresDown**: PostgreSQL inaccessible
- **HighAPIErrorRate**: Taux d'erreur API > 0.1 req/s

## 📊 Dashboards Grafana

### Dashboard système (à créer)
- Métriques CPU, mémoire, disque
- Graphiques de performance réseau

### Dashboard application (à créer)
- Métriques API (requêtes, erreurs, latence)
- Métriques Redis (utilisation, OPS)
- Métriques PostgreSQL (connexions, requêtes)

## 🔧 Configuration avancée

### Ajouter des métriques personnalisées

Dans le backend, exposez un endpoint `/api/metrics` qui retourne les métriques au format Prometheus :

```typescript
// backend/src/routes/metrics.ts
router.get('/metrics', async (req, res) => {
  // Retourner les métriques au format Prometheus
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});
```

### Personnaliser les alertes

Modifiez `docker/prometheus/alerts.yml` pour ajouter ou modifier des alertes.

## 📝 Notes

- Les données Prometheus sont conservées pendant 30 jours
- Les dashboards Grafana sont sauvegardés dans `docker/grafana/dashboards/`
- En production, sécurisez l'accès à Prometheus avec une authentification


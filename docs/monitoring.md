# Guide de Monitoring - Hub-Lib

**Version** : 1.0.0  
**Date** : 2024

---

## 📊 Vue d'Ensemble

Ce guide décrit comment monitorer Hub-Lib en production avec Prometheus et Grafana.

---

## 🎯 Métriques à Surveiller

### Backend API
- **CPU** : Utilisation processeur
- **Mémoire** : RAM utilisée
- **Requêtes** : Nombre de requêtes par seconde
- **Latence** : Temps de réponse (p50, p95, p99)
- **Erreurs** : Taux d'erreurs HTTP (4xx, 5xx)
- **Connexions** : Nombre de connexions actives

### PostgreSQL
- **Connexions** : Nombre de connexions actives/max
- **Requêtes** : Requêtes par seconde
- **Cache Hit Ratio** : Taux de hit du cache
- **Taille Base** : Taille de la base de données
- **Locks** : Verrous actifs
- **Replication Lag** : Si réplication activée

### Redis
- **Mémoire** : Utilisation mémoire
- **Connexions** : Nombre de connexions
- **Commandes** : Commandes par seconde
- **Hit/Miss Ratio** : Taux de hit du cache
- **Keys** : Nombre de clés
- **Expired Keys** : Clés expirées

### Frontend
- **Temps de Chargement** : Temps de chargement des pages
- **Erreurs JavaScript** : Erreurs côté client
- **Requêtes API** : Nombre de requêtes API
- **WebSocket** : Connexions WebSocket actives

---

## 🔧 Configuration Prometheus

### Installation

Ajouter au `docker-compose.yml` :

```yaml
  prometheus:
    image: prom/prometheus:latest
    container_name: hub-lib-prometheus
    restart: unless-stopped
    volumes:
      - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    ports:
      - "9090:9090"
    networks:
      - hub-lib-network

volumes:
  prometheus_data:
```

### Configuration Prometheus

Créer `docker/prometheus/prometheus.yml` :

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3001']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

---

## 📈 Configuration Grafana

### Installation

Ajouter au `docker-compose.yml` :

```yaml
  grafana:
    image: grafana/grafana:latest
    container_name: hub-lib-grafana
    restart: unless-stopped
    volumes:
      - grafana_data:/var/lib/grafana
      - ./docker/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./docker/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
    networks:
      - hub-lib-network
    depends_on:
      - prometheus

volumes:
  grafana_data:
```

### Dashboards

Créer des dashboards pour :
- Vue d'ensemble système
- Backend API (latence, erreurs, requêtes)
- PostgreSQL (connexions, cache, requêtes)
- Redis (mémoire, hit ratio, connexions)
- Frontend (temps de chargement, erreurs)

---

## 📊 Métriques Backend

### Ajouter des Métriques Express

Installer `prom-client` :
```bash
npm install prom-client
```

Créer `backend/src/utils/metrics.ts` :
```typescript
import { Registry, Counter, Histogram } from 'prom-client';

const register = new Registry();

// Compteur de requêtes
export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// Histogram de latence
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export { register };
```

### Middleware Métriques

Créer `backend/src/middleware/metrics.ts` :
```typescript
import { Request, Response, NextFunction } from 'express';
import { httpRequestCounter, httpRequestDuration } from '../utils/metrics.js';

export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpRequestCounter.inc({
      method: req.method,
      route,
      status: res.statusCode,
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        route,
      },
      duration
    );
  });

  next();
};
```

### Endpoint /metrics

Ajouter dans `backend/src/server.ts` :
```typescript
import { register } from './utils/metrics.js';

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## 🔔 Alertes

### Configuration Alertmanager

Créer `docker/prometheus/alerts.yml` :

```yaml
groups:
  - name: hub-lib-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "Taux d'erreurs élevé"
          description: "Le taux d'erreurs est de {{ $value }}"

      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 2
        for: 5m
        annotations:
          summary: "Latence élevée"
          description: "La latence p95 est de {{ $value }}s"

      - alert: PostgreSQLConnectionsHigh
        expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.8
        for: 5m
        annotations:
          summary: "Connexions PostgreSQL élevées"

      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 5m
        annotations:
          summary: "Mémoire Redis élevée"
```

---

## 📝 Logs Structurés

### Winston (déjà configuré)

Les logs sont structurés avec Winston :
- Niveaux : error, warn, info, debug
- Format JSON pour parsing
- Rotation automatique

### Exemple de Log

```json
{
  "level": "info",
  "message": "Requête API",
  "method": "GET",
  "path": "/api/resources",
  "status": 200,
  "duration": 45,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🔍 Outils de Monitoring

### 1. Health Checks

```bash
# Backend
curl http://localhost:3001/health

# Tous les services
./scripts/test-validation.sh
```

### 2. Logs en Temps Réel

```bash
# Tous les services
docker-compose logs -f

# Backend uniquement
docker-compose logs -f backend | grep ERROR
```

### 3. Métriques Redis

```bash
docker exec -it hub-lib-redis redis-cli -a $REDIS_PASSWORD INFO stats
docker exec -it hub-lib-redis redis-cli -a $REDIS_PASSWORD INFO memory
```

### 4. Métriques PostgreSQL

```bash
docker exec -it hub-lib-postgres psql -U hub_lib_user -d hub_lib -c "SELECT * FROM pg_stat_database WHERE datname = 'hub_lib';"
```

---

## ✅ Checklist Monitoring

- [ ] Prometheus configuré
- [ ] Grafana configuré
- [ ] Dashboards créés
- [ ] Métriques backend exposées
- [ ] Alertes configurées
- [ ] Logs structurés
- [ ] Health checks fonctionnels
- [ ] Documentation à jour

---

## 🔗 Ressources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Node.js Metrics](https://github.com/siimon/prom-client)

---

**Guide de monitoring complet ! 📊**



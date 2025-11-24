# 🔐 Configuration SSL/HTTPS avec Let's Encrypt

## ✅ Configuration Actuelle

- **Certbot installé** : ✅
- **Configuration Nginx ACME** : ✅
- **Challenge accessible** : ✅ (quand écrit depuis le conteneur)

## ⚠️ Problème Identifié

Les fichiers écrits par Certbot sur l'hôte ne sont pas immédiatement visibles dans le conteneur Docker Nginx à cause d'un problème de synchronisation de volume.

**Limite Let's Encrypt actuelle** : Réessayer après 11:44:32 UTC

## 🔧 Solutions Possibles

### Option 1 : Utiliser Certbot via Docker (Recommandé)

```bash
# Installer Certbot dans le conteneur Nginx ou utiliser certbot/certbot
docker run -it --rm \
  -v /var/www/certbot:/var/www/certbot:rw \
  -v /etc/letsencrypt:/etc/letsencrypt:rw \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d hublib.ovh -d www.hublib.ovh \
  --email admin@hublib.ovh --agree-tos
```

### Option 2 : Créer les fichiers directement dans le conteneur

Modifier le script pour que Certbot écrive dans un volume partagé correctement monté.

### Option 3 : Utiliser le plugin Nginx de Certbot

```bash
sudo certbot --nginx -d hublib.ovh -d www.hublib.ovh
```

## 📋 Prochaines Étapes

1. Attendre la limite Let's Encrypt (11:44:32 UTC)
2. Utiliser une des solutions ci-dessus
3. Copier les certificats vers `docker/nginx/ssl/hublib.ovh/`
4. Activer `hublib.ovh.conf`
5. Redémarrer Nginx

## 🔄 Renouvellement Automatique

Une fois les certificats générés, configurer le renouvellement automatique :

```bash
sudo certbot renew --dry-run
```

Ajouter au crontab :
```bash
0 0 * * * certbot renew --quiet && docker compose -f /home/debian/Hub-Lib/docker-compose.yml restart nginx
```


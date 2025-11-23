# 🚀 Guide de Démarrage Rapide - Hub-Lib

**Temps estimé** : 5 minutes

---

## ⚡ Installation Express (Docker)

```bash
# 1. Cloner le projet
git clone <repository-url>
cd Hub-Lib

# 2. Copier les fichiers d'environnement
cp backend/.env.example backend/.env
cp .env.example .env

# 3. (Optionnel) Éditer les .env si nécessaire
# Les valeurs par défaut fonctionnent pour le développement

# 4. Démarrer tous les services
docker-compose up -d

# 5. Vérifier que tout fonctionne
curl http://localhost:3001/health
```

C'est tout ! 🎉

---

## 🎯 Accès aux Services

- **Frontend** : http://localhost:5173
- **Backend API** : http://localhost:3001
- **Health Check** : http://localhost:3001/health
- **Métriques** : http://localhost:3001/metrics
- **Prisma Studio** : `cd backend && npm run prisma:studio`

---

## 📝 Premiers Pas

### 1. Créer un Compte

Ouvrez http://localhost:5173 et créez un compte.

### 2. Créer une Ressource

Une fois connecté, créez votre première ressource.

### 3. Explorer l'API

```bash
# Liste des ressources publiques
curl http://localhost:3001/api/resources

# Health check
curl http://localhost:3001/health
```

---

## 🛠️ Commandes Utiles

```bash
# Voir les logs
docker-compose logs -f

# Redémarrer un service
docker-compose restart backend

# Arrêter tous les services
docker-compose down

# Arrêter et supprimer les données
docker-compose down -v
```

---

## 🐛 Problèmes Courants

### Le backend ne démarre pas

```bash
# Vérifier les logs
docker-compose logs backend

# Vérifier que PostgreSQL et Redis sont démarrés
docker-compose ps
```

### Erreur de connexion à la base

```bash
# Attendre quelques secondes que PostgreSQL soit prêt
# Ou redémarrer
docker-compose restart postgres
docker-compose restart backend
```

---

## 📚 Prochaines Étapes

- 📖 [Documentation complète](./INSTALLATION.md)
- 🏗️ [Architecture](./architecture.md)
- 🔄 [Migration des données](./migration-guide.md)
- 🚀 [Déploiement](./deployment.md)

---

**Bienvenue dans Hub-Lib ! 🎉**


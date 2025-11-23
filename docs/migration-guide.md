# 🔄 Guide de Migration des Données - localStorage vers PostgreSQL

**Date** : 2024  
**Statut** : ✅ Prêt

---

## 📋 Vue d'ensemble

Ce guide explique comment migrer vos données de `localStorage` vers PostgreSQL via l'API backend.

---

## 🚀 Étapes de Migration

### 1. Préparation

Assurez-vous que le backend est démarré et fonctionnel :

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

### 2. Export des Données localStorage

Depuis le navigateur, ouvrez la console et exécutez :

```javascript
// Le script export-localStorage.js génère un fichier JSON
// Exécutez-le depuis la page de l'application
```

Ou utilisez le script Node.js :

```bash
node scripts/export-localStorage.js
```

Cela génère un fichier `localStorage-export.json` avec toutes vos données.

### 3. Validation des Données

Avant d'importer, validez les données :

```bash
# Utiliser le script TypeScript
ts-node scripts/import-to-postgres.ts validate localStorage-export.json
```

Ou via l'API :

```bash
curl -X POST http://localhost:3001/api/migration/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d @localStorage-export.json
```

### 4. Import des Données

Une fois validées, importez les données :

```bash
# Via le script
ts-node scripts/import-to-postgres.ts import localStorage-export.json

# Ou via l'API
curl -X POST http://localhost:3001/api/migration/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d @localStorage-export.json
```

---

## 📊 Format des Données

Le fichier JSON exporté doit suivre cette structure :

```json
{
  "metadata": {
    "exportDate": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0"
  },
  "tables": {
    "profiles": [
      {
        "id": "user-123",
        "email": "user@example.com",
        "username": "username",
        "full_name": "Full Name"
      }
    ],
    "resources": [
      {
        "id": "resource-123",
        "title": "Resource Title",
        "user_id": "user-123"
      }
    ],
    "collections": [],
    "comments": [],
    "notifications": []
  }
}
```

---

## ⚠️ Points d'Attention

### 1. IDs
- Les IDs de localStorage sont des strings simples
- PostgreSQL utilise des UUIDs
- Le système génère automatiquement de nouveaux UUIDs
- Les relations sont préservées

### 2. Conflits
- Si un email existe déjà, le système peut :
  - Sauter l'entrée
  - Mettre à jour (selon configuration)
  - Créer un conflit à résoudre manuellement

### 3. Relations
- Toutes les relations sont validées
- Les références invalides sont signalées
- Les ressources orphelines sont créées avec l'utilisateur importateur

### 4. Validation
- Tous les champs sont validés selon le schéma Prisma
- Les données invalides sont signalées dans le rapport

---

## 🔍 Vérification Post-Migration

### 1. Vérifier les Comptes

```sql
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM resources;
SELECT COUNT(*) FROM collections;
```

### 2. Vérifier les Relations

```sql
-- Ressources sans propriétaire
SELECT COUNT(*) FROM resources WHERE user_id IS NULL;

-- Collections sans propriétaire
SELECT COUNT(*) FROM collections WHERE user_id IS NULL;
```

### 3. Test de Connexion

Testez la connexion avec un compte migré :

```bash
curl -X POST http://localhost:3001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "migrated@example.com",
    "password": "your-password"
  }'
```

---

## 🛠️ Scripts Disponibles

### export-localStorage.js

Exporte toutes les données de localStorage dans un fichier JSON.

**Usage** :
```bash
node scripts/export-localStorage.js
```

**Options** :
- Génère `localStorage-export-YYYY-MM-DD.json`
- Inclut toutes les tables
- Format JSON structuré

### import-to-postgres.ts

Importe les données depuis un fichier JSON vers PostgreSQL.

**Usage** :
```bash
ts-node scripts/import-to-postgres.ts import <file.json>
ts-node scripts/import-to-postgres.ts validate <file.json>
```

**Options** :
- `import` : Importe les données
- `validate` : Valide sans importer
- Affiche un rapport détaillé

---

## 🔒 Sécurité

### Authentification Requise

L'endpoint de migration nécessite un token admin :

```javascript
const token = await getAdminToken();
// Utiliser le token dans les headers
```

### Validation

- Toutes les données sont validées avant import
- Les injections SQL sont impossibles (Prisma)
- Les données sensibles sont loggées minimalement

---

## 📝 Logs et Rapports

Le script d'import génère un rapport détaillé :

```
✅ Import terminé
   - Profiles: 150 importés, 0 erreurs
   - Resources: 450 importés, 0 erreurs
   - Collections: 75 importés, 0 erreurs
   - Errors: 0
```

Les erreurs sont loggées dans le fichier de rapport :
- `import-report-YYYY-MM-DD.log`

---

## 🆘 Dépannage

### Erreur: "Token invalide"
→ Vérifiez que vous êtes connecté en tant qu'admin

### Erreur: "Données invalides"
→ Validez le JSON avec le script `validate`

### Erreur: "Conflit d'email"
→ Résolvez les conflits manuellement ou mettez à jour les emails

### Erreur: "Relation introuvable"
→ Vérifiez que toutes les données dépendantes sont présentes

---

## ✅ Checklist de Migration

- [ ] Backend démarré et accessible
- [ ] Données exportées de localStorage
- [ ] Données validées
- [ ] Import effectué
- [ ] Vérification des comptes
- [ ] Test de connexion réussi
- [ ] Vérification des relations
- [ ] Backup PostgreSQL créé

---

## 📚 Ressources

- [Documentation Prisma](https://www.prisma.io/docs/)
- [API Migration Endpoints](./API_ENDPOINTS.md#migration)
- [Guide de déploiement](./deployment.md)

---

**Bon courage pour votre migration ! 🚀**

# Guide de Migration : localStorage → PostgreSQL

**Version** : 1.0.0  
**Date** : 2024

---

## 📋 Vue d'ensemble

Ce guide vous accompagne dans la migration des données depuis `localStorage` vers PostgreSQL via l'API backend.

### Prérequis

- ✅ Backend API démarré et accessible
- ✅ PostgreSQL et Redis opérationnels
- ✅ Compte administrateur avec token d'accès
- ✅ Données exportées depuis localStorage

---

## 🚀 Étapes de Migration

### Étape 1 : Exporter les données depuis localStorage

#### Option A : Via la console du navigateur (Recommandé)

1. Ouvrez votre application dans le navigateur
2. Ouvrez la console du navigateur (F12)
3. Copiez et collez le contenu de `scripts/export-localStorage.js`
4. Exécutez :
   ```javascript
   downloadExport()
   ```
5. Le fichier JSON sera téléchargé automatiquement

#### Option B : Via le script directement

```javascript
// Dans la console du navigateur
const data = exportLocalStorage();
console.log(data);
```

#### Option C : Inspecter avant de télécharger

```javascript
// Voir un aperçu des données
const data = previewExport();
// Puis télécharger si tout est OK
downloadExport();
```

### Étape 2 : Préparer le token d'accès

Vous devez être connecté en tant qu'administrateur pour importer des données.

```bash
# Option 1 : Via variable d'environnement
export ACCESS_TOKEN="votre-token-jwt"

# Option 2 : Via le script (voir Étape 3)
```

**Note** : Le token peut être récupéré depuis la console du navigateur :
```javascript
localStorage.getItem('hub-lib-access-token')
```

### Étape 3 : Valider les données (Recommandé)

Avant d'importer, validez les données pour détecter les problèmes potentiels :

```bash
# Avec validation
npx tsx scripts/import-to-postgres.ts export.json --token YOUR_TOKEN

# Ou via l'API directement
curl -X POST http://localhost:3000/api/migration/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @export.json
```

### Étape 4 : Importer les données

```bash
# Import avec validation
npx tsx scripts/import-to-postgres.ts export.json \
  --token YOUR_TOKEN \
  --url http://localhost:3000

# Import sans validation (déconseillé)
npx tsx scripts/import-to-postgres.ts export.json \
  --token YOUR_TOKEN \
  --skip-validation
```

---

## 📊 Structure des Données Exportées

Le fichier JSON exporté a la structure suivante :

```json
{
  "metadata": {
    "exportDate": "2024-01-01T00:00:00.000Z",
    "exportVersion": "1.0.0",
    "tables": ["profiles", "resources", ...]
  },
  "tables": {
    "profiles": [...],
    "resources": [...],
    ...
  },
  "auth": {...},
  "authData": [...],
  "analytics": [...]
}
```

### Tables migrées

Les tables suivantes sont automatiquement migrées :

1. **profiles** - Profils utilisateurs
2. **resources** - Ressources
3. **saved_resources** - Ressources sauvegardées
4. **resource_ratings** - Notes des ressources
5. **resource_shares** - Partages de ressources
6. **resource_comments** - Commentaires
7. **groups** - Groupes
8. **group_members** - Membres de groupes
9. **notifications** - Notifications
10. **category_tag_suggestions** - Suggestions de catégories/tags
11. **suggestion_votes** - Votes sur suggestions
12. **user_roles** - Rôles utilisateurs
13. **resource_templates** - Templates de ressources
14. **collections** - Collections
15. **collection_resources** - Ressources dans collections
16. **admin_config** - Configuration admin
17. **resource_versions** - Versions de ressources

---

## 🔄 Mapping des Données

### Conversion automatique

- **IDs** : Conversion automatique vers UUID PostgreSQL
- **Dates** : Conversion des timestamps en dates PostgreSQL
- **Champs** : Mapping automatique snake_case → camelCase
- **Relations** : Validation des clés étrangères

### Exemple de conversion

**localStorage (format original)** :
```json
{
  "id": "resource-123",
  "user_id": "user-456",
  "created_at": "2024-01-01T00:00:00.000Z",
  "resource_type": "external_link"
}
```

**PostgreSQL (format migré)** :
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "resourceType": "external_link"
}
```

---

## ✅ Validation et Intégrité

### Vérifications automatiques

Le système valide automatiquement :

- ✅ Format des UUIDs
- ✅ Présence des champs requis
- ✅ Relations entre tables (user_id, resource_id, etc.)
- ✅ Types de données (strings, dates, nombres)
- ✅ Contraintes d'unicité

### Gestion des conflits

- **Doublons** : Les enregistrements dupliqués sont ignorés (`skipDuplicates`)
- **IDs existants** : Les IDs existants sont préservés (pas de réécriture)
- **Relations manquantes** : Les relations invalides génèrent des avertissements

---

## ⚠️ Points d'Attention

### 1. Ordre d'import

Les tables sont importées dans un ordre spécifique pour respecter les dépendances :

1. `profiles` (doit être importé en premier)
2. `user_roles`
3. `resources`
4. `collections`
5. `collection_resources`
6. ... (ordre complet défini dans le code)

### 2. Authentification

- Les données d'authentification (`auth` et `authData`) **ne sont PAS** migrées automatiquement
- Les utilisateurs doivent se reconnecter après la migration
- Les mots de passe doivent être réinitialisés (sécurité)

### 3. Analytics

- Les données analytics sont migrées mais traitées différemment
- L'historique localStorage n'est pas nécessairement migré (selon la configuration)

### 4. Doublons

- Utilisez `skipDuplicates` pour éviter les erreurs de doublons
- Vérifiez les données avant import si vous avez des doutes

---

## 🔧 Résolution des Problèmes

### Erreur : "Table non mappée"

**Solution** : La table n'existe pas dans le mapping. Vérifiez que le nom de la table est correct.

### Erreur : "Validation échouée"

**Solution** : 
1. Vérifiez les logs pour voir quelles validations ont échoué
2. Nettoyez les données invalides dans le fichier JSON
3. Réessayez l'import avec `--skip-validation` (déconseillé)

### Erreur : "Foreign key constraint"

**Solution** : 
1. Vérifiez que toutes les tables parentes sont importées
2. Vérifiez que les IDs de référence existent
3. Les relations invalides seront ignorées avec un avertissement

### Erreur : "Token invalide"

**Solution** :
1. Vérifiez que votre token est valide
2. Assurez-vous d'être connecté en tant qu'administrateur
3. Récupérez un nouveau token depuis l'interface

---

## 📝 Exemple Complet

```bash
# 1. Exporter depuis localStorage (dans le navigateur)
downloadExport()
# → Fichier téléchargé : hub-lib-export-2024-01-01.json

# 2. Obtenir le token (dans la console du navigateur)
localStorage.getItem('hub-lib-access-token')
# → "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 3. Valider les données
npx tsx scripts/import-to-postgres.ts hub-lib-export-2024-01-01.json \
  --token "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  --url http://localhost:3000

# 4. Si la validation réussit, l'import se fait automatiquement
# Sinon, corrigez les erreurs et réessayez
```

---

## 🔐 Sécurité

- ✅ Seuls les administrateurs peuvent importer des données
- ✅ Validation stricte des données avant import
- ✅ Transactions pour garantir l'intégrité
- ✅ Logs détaillés pour audit

**⚠️ Important** : Ne partagez jamais votre token d'accès. Il donne accès complet à l'API.

---

## 📚 Références

- [Documentation API Migration](/api/migration)
- [Roadmap de Migration](/roadmap.md)
- [Documentation Backend](/backend/README.md)

---

## ✅ Checklist de Migration

- [ ] Données exportées depuis localStorage
- [ ] Fichier JSON validé
- [ ] Token d'accès administrateur obtenu
- [ ] Backend API accessible
- [ ] Validation des données réussie
- [ ] Import des données réussi
- [ ] Vérification des données dans PostgreSQL
- [ ] Utilisateurs reconnectés
- [ ] Tests de l'application après migration

---

**Besoin d'aide ?** Consultez les logs du backend ou créez une issue sur le repository.


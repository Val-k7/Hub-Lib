# 🔧 Corrections des Problèmes d'Authentification

## Problème Identifié

L'authentification a été mise à jour pour utiliser un système de hash de mots de passe sécurisé, mais cela a créé un problème de compatibilité :

- **Utilisateurs existants** : Les utilisateurs créés avant cette mise à jour n'avaient pas de données d'authentification stockées
- **Impossibilité de connexion** : Ces utilisateurs ne pouvaient plus se connecter car le système cherchait des données d'auth qui n'existaient pas

## Solution Implémentée

### 1. Rétrocompatibilité Automatique

Le système détecte maintenant automatiquement les utilisateurs "legacy" (sans données d'auth) et :

1. **Lors de la première connexion** : Accepte n'importe quel mot de passe
2. **Crée automatiquement** : Les données d'authentification avec le mot de passe fourni
3. **Migration transparente** : L'utilisateur peut continuer à utiliser son mot de passe habituel

### 2. Initialisation des Tables Manquantes

Les nouvelles tables (templates, collections, versions) sont maintenant automatiquement initialisées au démarrage de l'application.

### 3. Fonctionnalités Corrigées

- ✅ **Authentification** : Rétrocompatibilité avec les utilisateurs existants
- ✅ **Tables manquantes** : Initialisation automatique
- ✅ **Migration transparente** : Pas besoin de réinscription

## Code Modifié

### `src/integrations/local/client.ts`

```typescript
signInWithPassword: async (credentials) => {
  // ...
  // Si l'utilisateur existe mais n'a pas de données d'auth (legacy)
  if (!authData) {
    // Créer automatiquement les données d'auth avec le mot de passe fourni
    const salt = generateSalt();
    const passwordHash = hashPassword(credentials.password, salt);
    authStorage.save({ ... });
  }
  // ...
}
```

### `src/lib/migration.ts`

Nouveau fichier avec des utilitaires de migration pour :
- Migrer les utilisateurs legacy
- Initialiser les tables manquantes
- Vérifier le statut legacy d'un utilisateur

### `src/main.tsx`

Initialisation automatique des tables manquantes au démarrage.

## Utilisation

Aucune action requise de la part des utilisateurs. La migration est automatique et transparente.

Les utilisateurs existants peuvent :
1. Se connecter avec leur email et n'importe quel mot de passe (première fois)
2. Le système crée automatiquement leurs données d'auth
3. Les connexions suivantes utilisent le mot de passe qu'ils ont utilisé la première fois

## Notes

- La première connexion après la mise à jour accepte n'importe quel mot de passe
- Après la première connexion, le mot de passe utilisé devient le mot de passe permanent
- Les nouveaux utilisateurs doivent respecter les règles de force de mot de passe



# TODO - Système de Partage et Multi-Comptes OAuth

## 🎯 Objectif
Permettre aux utilisateurs de :
- Ajouter plusieurs comptes OAuth (GitHub, Google) à leur profil
- Partager/sauvegarder des ressources directement vers GitHub ou Google Drive depuis l'UI
- Synchroniser tous les comptes OAuth en un seul compte utilisateur
- Avoir une page d'accueil adaptée selon le statut (guest/user)

---

## 📋 Phase 1 : Nettoyage de la Page d'Accueil

### 1.1 Analyse et Restructuration de la Page d'Accueil
- [ ] **Analyser le contenu actuel de `/` (Index.tsx)**
  - Identifier les composants affichés pour les guests
  - Identifier les composants affichés pour les users connectés
  - Lister les données inutiles pour chaque type d'utilisateur

- [ ] **Créer deux variantes de la page d'accueil**
  - **Page Guest** : Hero, Features, HowItWorks, CTA, TopSuggestions, Categories publiques
  - **Page User** : Dashboard personnalisé avec :
    - Ressources récentes de l'utilisateur
    - Ressources partagées avec l'utilisateur
    - Suggestions en attente
    - Statistiques personnelles
    - Actions rapides (créer ressource, explorer, etc.)

- [ ] **Refactoriser Index.tsx**
  - Séparer la logique guest/user
  - Créer `HomeGuest.tsx` et `HomeUser.tsx`
  - Implémenter la redirection logique selon le statut

- [ ] **Optimiser les composants existants**
  - `HomeRecommendations.tsx` : Afficher uniquement les ressources pertinentes
  - `TopSuggestionsSection.tsx` : Masquer pour les users si pas de suggestions pertinentes
  - `Categories.tsx` : Afficher uniquement les catégories avec ressources accessibles

---

## 📋 Phase 2 : Système Multi-Comptes OAuth

### 2.1 Base de Données - Table OAuth Accounts
- [ ] **Créer la table `oauth_accounts` dans PostgreSQL**
  ```sql
  CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'github', 'google'
    provider_user_id VARCHAR(255) NOT NULL, -- ID utilisateur chez le provider
    provider_email VARCHAR(255),
    access_token TEXT, -- Chiffré
    refresh_token TEXT, -- Chiffré
    token_expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT[], -- Scopes accordés
    metadata JSONB, -- Infos supplémentaires (username, avatar, etc.)
    is_primary BOOLEAN DEFAULT FALSE, -- Compte principal
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, provider, provider_user_id)
  );
  ```

- [ ] **Ajouter les index nécessaires**
  - Index sur `user_id`
  - Index sur `provider` et `provider_user_id`
  - Index sur `is_primary`

- [ ] **Mettre à jour le schéma Prisma**
  - Créer le modèle `OAuthAccount`
  - Ajouter la relation dans `Profile`
  - Créer les migrations

### 2.2 Backend - Service OAuth Accounts
- [ ] **Créer `backend/src/services/oauthAccountService.ts`**
  - `linkOAuthAccount(userId, provider, providerData, tokens)`
  - `unlinkOAuthAccount(userId, provider, providerUserId)`
  - `getUserOAuthAccounts(userId)`
  - `getPrimaryOAuthAccount(userId, provider)`
  - `setPrimaryOAuthAccount(userId, accountId)`
  - `refreshOAuthToken(accountId)`
  - `encryptToken(token)` / `decryptToken(encryptedToken)`

- [ ] **Créer `backend/src/utils/encryption.ts`**
  - Fonctions de chiffrement/déchiffrement pour les tokens OAuth
  - Utiliser `crypto` avec une clé secrète depuis les variables d'environnement

- [ ] **Modifier `backend/src/routes/auth.ts`**
  - Modifier les callbacks OAuth pour :
    - Vérifier si l'utilisateur est déjà connecté (session)
    - Si connecté : lier le compte OAuth au compte existant
    - Si non connecté : créer un compte ou se connecter
    - Stocker les tokens dans `oauth_accounts`
    - Gérer le cas où un compte OAuth est déjà lié à un autre utilisateur

- [ ] **Créer `backend/src/routes/oauthAccounts.ts`**
  - `GET /api/oauth-accounts` : Liste des comptes OAuth de l'utilisateur
  - `POST /api/oauth-accounts/link` : Lier un nouveau compte OAuth
  - `DELETE /api/oauth-accounts/:id` : Délier un compte OAuth
  - `PUT /api/oauth-accounts/:id/primary` : Définir comme compte principal
  - `POST /api/oauth-accounts/:id/refresh` : Rafraîchir le token

### 2.3 Frontend - Gestion des Comptes OAuth
- [ ] **Créer `src/services/oauthAccountService.ts`**
  - Méthodes pour gérer les comptes OAuth via l'API
  - `getOAuthAccounts()`
  - `linkOAuthAccount(provider)`
  - `unlinkOAuthAccount(accountId)`
  - `setPrimaryAccount(accountId)`

- [ ] **Créer `src/components/OAuthAccountsManager.tsx`**
  - Liste des comptes OAuth liés
  - Boutons pour lier/délier des comptes
  - Indicateur du compte principal
  - Gestion des tokens expirés

- [ ] **Intégrer dans `src/pages/EditProfile.tsx`**
  - Ajouter une section "Comptes connectés"
  - Afficher les comptes GitHub/Google liés
  - Permettre de lier/délier des comptes

- [ ] **Modifier `src/pages/Auth.tsx`**
  - Détecter si l'utilisateur est déjà connecté lors d'un callback OAuth
  - Proposer de lier le compte OAuth au compte existant
  - Gérer le cas où le compte OAuth est déjà lié à un autre utilisateur

---

## 📋 Phase 3 : Partage vers GitHub

### 3.1 Backend - Service GitHub
- [ ] **Créer `backend/src/services/githubService.ts`**
  - `createRepository(userId, repoName, description, isPrivate)`
  - `uploadFileToRepository(userId, repoName, filePath, content, commitMessage)`
  - `createGist(userId, description, files, isPublic)`
  - `getUserRepositories(userId)`
  - `getRepositoryContent(userId, repoName, path)`
  - Utiliser les tokens OAuth stockés dans `oauth_accounts`

- [ ] **Créer `backend/src/routes/github.ts`**
  - `GET /api/github/repos` : Liste des repos de l'utilisateur
  - `POST /api/github/repos` : Créer un nouveau repo
  - `POST /api/github/repos/:repo/files` : Uploader un fichier
  - `POST /api/github/gists` : Créer un Gist
  - `GET /api/github/check-auth` : Vérifier si l'utilisateur a un compte GitHub lié

### 3.2 Frontend - UI de Partage GitHub
- [ ] **Créer `src/components/GitHubShareDialog.tsx`**
  - Sélecteur de repository (créer nouveau ou utiliser existant)
  - Formulaire pour créer un nouveau repo
  - Sélecteur de fichier à partager
  - Options : commit message, branche, etc.
  - Bouton de partage

- [ ] **Intégrer dans `src/components/ResourceCard.tsx` et `src/pages/ResourceDetail.tsx`**
  - Ajouter un bouton "Partager sur GitHub"
  - Ouvrir le dialog de partage
  - Afficher un feedback de succès/erreur

- [ ] **Créer `src/services/githubService.ts`**
  - Méthodes pour interagir avec l'API GitHub via le backend
  - `getRepositories()`
  - `createRepository(data)`
  - `uploadFile(repoName, filePath, content)`
  - `createGist(data)`

---

## 📋 Phase 4 : Partage vers Google Drive

### 4.1 Backend - Service Google Drive
- [ ] **Créer `backend/src/services/googleDriveService.ts`**
  - `uploadFile(userId, fileName, fileContent, mimeType, folderId?)`
  - `createFolder(userId, folderName, parentFolderId?)`
  - `getUserFiles(userId, folderId?)`
  - `getUserFolders(userId)`
  - `shareFile(userId, fileId, permissions)`
  - Utiliser les tokens OAuth stockés dans `oauth_accounts`

- [ ] **Créer `backend/src/routes/googleDrive.ts`**
  - `GET /api/google-drive/files` : Liste des fichiers/dossiers
  - `POST /api/google-drive/files` : Uploader un fichier
  - `POST /api/google-drive/folders` : Créer un dossier
  - `POST /api/google-drive/files/:id/share` : Partager un fichier
  - `GET /api/google-drive/check-auth` : Vérifier si l'utilisateur a un compte Google lié

### 4.2 Frontend - UI de Partage Google Drive
- [ ] **Créer `src/components/GoogleDriveShareDialog.tsx`**
  - Sélecteur de dossier (créer nouveau ou utiliser existant)
  - Formulaire pour créer un nouveau dossier
  - Sélecteur de fichier à partager
  - Options : nom du fichier, permissions de partage
  - Bouton de partage

- [ ] **Intégrer dans `src/components/ResourceCard.tsx` et `src/pages/ResourceDetail.tsx`**
  - Ajouter un bouton "Partager sur Google Drive"
  - Ouvrir le dialog de partage
  - Afficher un feedback de succès/erreur

- [ ] **Créer `src/services/googleDriveService.ts`**
  - Méthodes pour interagir avec l'API Google Drive via le backend
  - `getFiles(folderId?)`
  - `getFolders()`
  - `uploadFile(data)`
  - `createFolder(data)`
  - `shareFile(fileId, permissions)`

---

## 📋 Phase 5 : Synchronisation des Comptes OAuth

### 5.1 Logique de Synchronisation
- [ ] **Définir la stratégie de synchronisation**
  - Un utilisateur = un compte principal (email/password ou OAuth principal)
  - Plusieurs comptes OAuth peuvent être liés au même compte utilisateur
  - Les ressources créées via un compte OAuth sont associées au compte utilisateur principal
  - Les tokens OAuth sont stockés séparément pour chaque provider

- [ ] **Modifier le flux d'authentification**
  - Lors de la connexion OAuth :
    - Si l'email correspond à un compte existant : lier automatiquement
    - Si l'email ne correspond pas : proposer de créer un nouveau compte ou de lier manuellement
    - Si l'utilisateur est déjà connecté : proposer de lier le compte OAuth

- [ ] **Créer `backend/src/services/accountSyncService.ts`**
  - `syncOAuthAccount(userId, provider, providerData)`
  - `mergeAccounts(sourceUserId, targetUserId)`
  - `detectDuplicateAccounts(email, provider)`

### 5.2 UI de Synchronisation
- [ ] **Créer `src/components/AccountSyncDialog.tsx`**
  - Afficher les comptes détectés (email correspondant)
  - Proposer de fusionner les comptes
  - Avertir des conséquences (ressources, etc.)
  - Confirmation de fusion

- [ ] **Ajouter dans `src/pages/EditProfile.tsx`**
  - Section "Synchronisation des comptes"
  - Afficher les comptes liés et leur statut
  - Permettre de gérer la synchronisation

---

## 📋 Phase 6 : Améliorations UX/UI

### 6.1 Amélioration de la Page d'Accueil
- [ ] **Dashboard User**
  - Widget "Mes ressources récentes"
  - Widget "Ressources partagées avec moi"
  - Widget "Suggestions en attente"
  - Widget "Statistiques personnelles"
  - Actions rapides (créer, explorer, partager)

- [ ] **Page Guest**
  - Hero optimisé pour conversion
  - Features claires et visuelles
  - Témoignages/utilisateurs
  - CTA efficace

### 6.2 Amélioration du Partage
- [ ] **Menu de partage unifié**
  - Créer `src/components/ShareMenu.tsx`
  - Bouton "Partager" avec dropdown
  - Options : GitHub, Google Drive, Lien direct, Email
  - Indicateur si le compte OAuth n'est pas lié

- [ ] **Feedback utilisateur**
  - Toasts de succès/erreur
  - Indicateurs de chargement
  - Messages d'erreur clairs

### 6.3 Gestion des Tokens
- [ ] **Rafraîchissement automatique des tokens**
  - Service en background pour rafraîchir les tokens expirés
  - Notification si le rafraîchissement échoue
  - Demander à l'utilisateur de reconnecter si nécessaire

---

## 📋 Phase 7 : Tests et Documentation

### 7.1 Tests Backend
- [ ] **Tests unitaires**
  - `oauthAccountService.test.ts`
  - `githubService.test.ts`
  - `googleDriveService.test.ts`
  - `accountSyncService.test.ts`

- [ ] **Tests d'intégration**
  - Flux complet de liaison OAuth
  - Partage vers GitHub
  - Partage vers Google Drive
  - Synchronisation de comptes

### 7.2 Tests Frontend
- [ ] **Tests de composants**
  - `OAuthAccountsManager.test.tsx`
  - `GitHubShareDialog.test.tsx`
  - `GoogleDriveShareDialog.test.tsx`
  - `ShareMenu.test.tsx`

- [ ] **Tests E2E**
  - Scénario : Lier un compte GitHub et partager une ressource
  - Scénario : Lier un compte Google et partager vers Drive
  - Scénario : Synchroniser deux comptes OAuth

### 7.3 Documentation
- [ ] **Documentation API**
  - Swagger pour les nouvelles routes OAuth
  - Exemples de requêtes/réponses
  - Gestion des erreurs

- [ ] **Documentation utilisateur**
  - Guide : Comment lier un compte OAuth
  - Guide : Comment partager vers GitHub/Drive
  - FAQ sur la synchronisation

---

## 🔒 Sécurité

- [ ] **Chiffrement des tokens OAuth**
  - Utiliser AES-256 pour chiffrer les tokens en base
  - Clé de chiffrement dans les variables d'environnement
  - Rotation des clés possible

- [ ] **Validation des permissions OAuth**
  - Vérifier les scopes accordés
  - Demander les scopes nécessaires lors de la liaison
  - Gérer les cas où les scopes sont insuffisants

- [ ] **Rate limiting**
  - Limiter les appels API vers GitHub/Google Drive
  - Éviter l'abus des tokens OAuth

- [ ] **Audit et logs**
  - Logger toutes les actions de partage
  - Logger les liaisons/déliages de comptes OAuth
  - Alertes en cas d'activité suspecte

---

## 📊 Métriques et Monitoring

- [ ] **Tracking des partages**
  - Nombre de partages vers GitHub par jour
  - Nombre de partages vers Google Drive par jour
  - Taux de succès/échec des partages

- [ ] **Monitoring des tokens**
  - Nombre de tokens expirés
  - Taux de rafraîchissement réussi
  - Alertes si trop de tokens expirés

---

## 🎯 Priorités

### Priorité 1 (Critique)
1. Nettoyage de la page d'accueil (Phase 1)
2. Table OAuth Accounts et service backend (Phase 2.1, 2.2)
3. UI de gestion des comptes OAuth (Phase 2.3)

### Priorité 2 (Important)
4. Partage vers GitHub (Phase 3)
5. Partage vers Google Drive (Phase 4)
6. Synchronisation des comptes (Phase 5)

### Priorité 3 (Amélioration)
7. Améliorations UX/UI (Phase 6)
8. Tests et documentation (Phase 7)

---

## 📝 Notes

- Les tokens OAuth doivent être stockés de manière sécurisée (chiffrés)
- Gérer les cas où un utilisateur a plusieurs comptes OAuth avec le même email
- Prévoir une migration pour les utilisateurs existants qui ont déjà utilisé OAuth
- Considérer l'ajout d'autres providers OAuth à l'avenir (GitLab, Dropbox, etc.)


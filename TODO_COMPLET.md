# 📋 TODO Complet - Hub-Lib

**Date de création** : 2024  
**Dernière mise à jour** : 2024

---

## 🔴 CRITIQUE - Authentification & Sécurité

1. **Créer table d'authentification pour mots de passe**
   - Fichier : `backend/src/services/authService.ts` (lignes 149, 198)
   - Créer table `auth_profiles` dans PostgreSQL avec `user_id`, `password_hash`, `created_at`, `updated_at`
   - Ajouter modèle Prisma correspondant
   - Modifier `signUp()` pour stocker le hash du mot de passe
   - Estimation : 2-3 heures

2. **Implémenter vérification de mot de passe dans signIn()**
   - Fichier : `backend/src/services/authService.ts` (lignes 198-204)
   - Décommenter et implémenter la vérification avec `verifyPassword()`
   - Récupérer le hash depuis `auth_profiles`
   - Estimation : 1 heure

3. **Implémenter routes OAuth backend (GitHub, Google)**
   - Fichier : `backend/src/routes/auth.ts`
   - Créer `GET /api/auth/oauth/github` et `GET /api/auth/oauth/google`
   - Créer callbacks `GET /api/auth/oauth/callback/github` et `/callback/google`
   - Intégrer SDK OAuth (passport-github2, passport-google-oauth20)
   - Gérer tokens OAuth et créer profils utilisateurs
   - Estimation : 1 journée

4. **Remplacer simulation OAuth frontend par vraie intégration**
   - Fichier : `src/lib/oauth.ts`
   - Remplacer `simulateOAuthLogin()` par appels API vers routes OAuth backend
   - Rediriger vers URLs OAuth des providers
   - Gérer les callbacks OAuth
   - Estimation : 4-6 heures

---

## 🟠 IMPORTANT - Services & Fonctionnalités Essentielles

5. **Implémenter service d'envoi d'emails**
   - Fichier : `backend/src/services/queueService.ts` (lignes 278-283)
   - Intégrer service d'email (Nodemailer, SendGrid, AWS SES)
   - Créer templates d'emails (bienvenue, notifications, etc.)
   - Implémenter envoi asynchrone via queue
   - Estimation : 1 journée

6. **Implémenter stockage long terme des analytics dans PostgreSQL**
   - Fichier : `backend/src/services/queueService.ts` (ligne 272), `backend/src/routes/analytics.ts` (ligne 95)
   - Créer table `analytics_events` dans PostgreSQL
   - Stocker événements importants en base pour historique
   - Garder Redis pour statistiques temps réel
   - Estimation : 1 journée

7. **Implémenter statistiques utilisateur spécifiques**
   - Fichier : `backend/src/routes/analytics.ts` (ligne 101)
   - Créer endpoint `GET /api/analytics/user/:userId/stats`
   - Agréger données depuis Redis et PostgreSQL
   - Retourner statistiques personnalisées
   - Estimation : 4-6 heures

8. **Implémenter affichage ressources partagées dans liste**
   - Fichier : `backend/src/routes/resources.ts` (ligne 79)
   - Ajouter condition dans `where.OR` pour inclure `resourceShares`
   - Vérifier `sharedWithUserId` ou `sharedWithGroupId` (si membre du groupe)
   - Estimation : 2-3 heures

9. **Créer routes pour partage de ressources**
   - Fichier : `backend/src/routes/resources.ts` ou nouveau fichier
   - `POST /api/resources/:id/share` - Partager une ressource avec utilisateur/groupe
   - `GET /api/resources/:id/shares` - Liste des partages d'une ressource
   - `DELETE /api/resources/:id/shares/:shareId` - Retirer un partage
   - Estimation : 1 journée

10. **Créer routes pour favoris/sauvegarde de ressources**
    - Fichier : `backend/src/routes/resources.ts` ou nouveau fichier
    - `POST /api/resources/:id/save` - Sauvegarder une ressource (favoris)
    - `DELETE /api/resources/:id/save` - Retirer des favoris
    - `GET /api/resources/saved` - Liste des ressources sauvegardées
    - Estimation : 4-6 heures

11. **Créer routes pour notes/ratings de ressources**
    - Fichier : `backend/src/routes/resources.ts` ou nouveau fichier
    - `POST /api/resources/:id/rating` - Noter une ressource
    - `PUT /api/resources/:id/rating` - Modifier sa note
    - `DELETE /api/resources/:id/rating` - Supprimer sa note
    - `GET /api/resources/:id/ratings` - Liste des notes d'une ressource
    - Estimation : 4-6 heures

12. **Créer routes templates de ressources**
    - Fichier : `backend/src/routes/templates.ts`
    - `GET /api/templates` - Liste des templates
    - `GET /api/templates/:id` - Détails d'un template
    - `POST /api/templates` - Créer un template
    - `PUT /api/templates/:id` - Mettre à jour un template
    - `DELETE /api/templates/:id` - Supprimer un template
    - Estimation : 1 journée

13. **Créer routes pour versions de ressources**
    - Fichier : `backend/src/routes/versions.ts`
    - `GET /api/resources/:id/versions` - Liste des versions d'une ressource
    - `GET /api/resources/:id/versions/:versionNumber` - Détails d'une version
    - `POST /api/resources/:id/versions` - Créer une nouvelle version
    - `POST /api/resources/:id/versions/:versionNumber/restore` - Restaurer une version
    - `DELETE /api/resources/:id/versions/:versionNumber` - Supprimer une version
    - Estimation : 1 journée

14. **Créer routes pour API tokens**
    - Fichier : `backend/src/routes/apiTokens.ts`
    - `GET /api/api-tokens` - Liste des tokens API de l'utilisateur
    - `POST /api/api-tokens` - Créer un nouveau token API
    - `DELETE /api/api-tokens/:id` - Supprimer un token API
    - `GET /api/api-tokens/:id` - Détails d'un token
    - Middleware pour valider tokens API dans les requêtes
    - Estimation : 1 journée

15. **Créer routes pour hiérarchie de catégories**
    - Fichier : `backend/src/routes/categories.ts`
    - `GET /api/categories` - Liste des catégories avec hiérarchie
    - `GET /api/categories/:id` - Détails d'une catégorie
    - `POST /api/categories` - Créer une catégorie
    - `PUT /api/categories/:id` - Mettre à jour une catégorie
    - `DELETE /api/categories/:id` - Supprimer une catégorie
    - `GET /api/categories/:id/children` - Catégories enfants
    - Estimation : 1 journée

16. **Créer routes pour filtres de catégories**
    - Fichier : `backend/src/routes/categories.ts` ou nouveau fichier
    - `GET /api/categories/:id/filters` - Liste des filtres d'une catégorie
    - `POST /api/categories/:id/filters` - Créer un filtre
    - `PUT /api/filters/:id` - Mettre à jour un filtre
    - `DELETE /api/filters/:id` - Supprimer un filtre
    - Estimation : 4-6 heures

---

## 🟡 MOYEN - Upload de Fichiers & Infrastructure

17. **Implémenter serveur de stockage de fichiers**
    - Fichier : `src/pages/CreateResource.tsx` (lignes 296-302), `src/components/FileUpload.tsx`
    - Choisir solution de stockage (S3, local filesystem, Cloudinary)
    - Créer endpoint `POST /api/files/upload` dans backend
    - Utiliser `multer` ou équivalent pour gérer uploads
    - Stocker métadonnées en base, fichier sur serveur
    - Estimation : 2-3 jours

18. **Créer routes backend pour upload de fichiers**
    - Fichier : `backend/src/routes/files.ts`
    - `POST /api/files/upload` avec validation type/taille
    - `GET /api/files/:id` pour télécharger
    - `DELETE /api/files/:id` pour supprimer
    - Ajouter gestion des permissions
    - Estimation : 1 journée

19. **Remplacer stockage localStorage par serveur pour fichiers**
    - Fichier : `src/pages/CreateResource.tsx`, `src/pages/EditResource.tsx`
    - Modifier `FileUpload` pour uploader vers serveur au lieu de base64
    - Mettre à jour logique de création/édition de ressources
    - Estimation : 4-6 heures

---

## 🟡 MOYEN - UI/UX

20. **Modifier bouton "Créer une ressource" pour ouvrir overlay**
    - Fichier : `src/components/Header.tsx` (lignes 160, 327, 434)
    - Créer état pour gérer ouverture/fermeture overlay
    - Remplacer `navigate("/create-resource")` par `setShowCreateOverlay(true)`
    - Ajouter composant Dialog/Sheet pour overlay
    - Estimation : 3-4 heures

21. **Convertir CreateResource en composant overlay**
    - Fichier : `src/pages/CreateResource.tsx`
    - Extraire formulaire dans `CreateResourceForm.tsx`
    - Créer `CreateResourceOverlay.tsx` avec Dialog/Sheet
    - Adapter layout pour fonctionner en overlay (pas de Header/Footer)
    - Gérer navigation après création (fermer overlay et rediriger)
    - Estimation : 4-6 heures

22. **Améliorer menu déroulant "Créer" avec overlays**
    - Fichier : `src/components/Header.tsx` (lignes 146-181)
    - Modifier toutes options menu pour ouvrir overlays
    - "Créer une ressource" → overlay CreateResource
    - "Utiliser un template" → overlay TemplateSelector
    - "Importer depuis GitHub" → overlay avec formulaire GitHub pré-rempli
    - "Uploader un fichier" → overlay avec formulaire upload pré-rempli
    - Estimation : 2-3 heures

---

## 🟡 MOYEN - Qualité de Code

23. **Remplacer console.log/error par logger**
    - Fichier : Tous fichiers avec `console.log`, `console.error`, `console.warn`
    - Remplacer par `logger.info()`, `logger.error()`, `logger.warn()`
    - Fichiers concernés : `src/integrations/api/websocket.ts`, `src/services/analyticsService.ts`, `src/pages/`, etc.
    - Estimation : 1 journée

24. **Améliorer gestion d'erreurs dans services frontend**
    - Fichier : `src/services/`
    - Utiliser `useErrorHandler` hook de manière cohérente
    - Remplacer `throw new Error()` par gestion d'erreurs structurée
    - Ajouter context et logging appropriés
    - Estimation : 2-3 jours

25. **Réduire utilisation de type `any`**
    - Fichier : Tous fichiers avec `any` (266 occurrences trouvées)
    - Créer types/interfaces appropriés
    - Typage strict pour améliorer sécurité et maintenabilité
    - Estimation : 1-2 semaines

26. **Implémenter check automatique disponibilité backend**
    - Fichier : `src/integrations/client.ts` (ligne 23)
    - Décommenter et implémenter le check de santé du backend
    - Basculer automatiquement entre ApiClient et LocalClient
    - Estimation : 2-3 heures

---

## 🟢 FAIBLE - Migration Frontend

27. **Activer ApiClient par défaut au lieu de LocalClient**
    - Fichier : `src/integrations/client.ts`
    - Changer logique pour utiliser ApiClient par défaut
    - LocalClient en fallback si backend indisponible
    - Estimation : 2-3 heures

28. **Migrer seedInitialData vers API backend**
    - Fichier : `src/services/seedData.ts`
    - Remplacer appels `client.from()` par appels API backend
    - Créer endpoint `POST /api/admin/seed` si nécessaire
    - Estimation : 2-3 heures

29. **Migrer services frontend vers API backend**
    - Fichier : `src/services/`
    - Migrer `resourceService.ts` vers API
    - Migrer `collectionService.ts` vers API
    - Migrer `commentService.ts` vers API
    - Migrer `unifiedMetadataService.ts` vers API
    - Migrer tous autres services progressivement
    - Estimation : 1-2 semaines

30. **Migrer hooks frontend vers API backend**
    - Fichier : `src/hooks/`
    - Migrer `useResources.tsx` vers API
    - Migrer `useCollections.tsx` vers API
    - Migrer `useComments.tsx` vers API
    - Migrer `useResourceSharing.tsx` vers API
    - Migrer tous autres hooks progressivement
    - Estimation : 1 semaine

31. **Migrer pages frontend vers API backend**
    - Fichier : `src/pages/`
    - Remplacer appels `localClient` par appels API
    - Mettre à jour gestion d'erreurs
    - Adapter logique de chargement/affichage
    - Estimation : 1 semaine

---

## 🟢 FAIBLE - Tests & Documentation

32. **Ajouter tests unitaires complets**
    - Fichier : `backend/src/**/__tests__/`
    - Tests pour `authService.ts`
    - Tests pour `queueService.ts`
    - Tests pour `notificationService.ts`
    - Tests pour `voteService.ts`
    - Tests pour `cacheService.ts`
    - Tests pour tous services
    - Estimation : 1-2 semaines

33. **Ajouter tests d'intégration complets**
    - Fichier : `backend/src/__tests__/e2e/`
    - Tests E2E flux authentification
    - Tests E2E flux ressources
    - Tests E2E flux collections
    - Tests E2E flux commentaires
    - Tests E2E flux groupes
    - Tests E2E tous flux principaux
    - Estimation : 1 semaine

34. **Créer documentation API Swagger/OpenAPI**
    - Fichier : `backend/`
    - Intégrer Swagger/OpenAPI (swagger-ui-express)
    - Documenter tous endpoints avec annotations
    - Générer documentation automatiquement
    - Ajouter exemples requêtes/réponses
    - Implémenter endpoint `/api/docs` mentionné dans server.ts
    - Estimation : 2-3 jours

---

## 🟢 FAIBLE - DevOps & Déploiement

35. **Optimiser Dockerfile backend pour production**
    - Fichier : `backend/Dockerfile`
    - Optimiser Dockerfile (multi-stage build)
    - Ajouter gestion variables d'environnement
    - Configurer health checks
    - Optimiser taille image
    - Estimation : 2-3 heures

36. **Créer script migration données localStorage → PostgreSQL**
    - Fichier : `scripts/`
    - Créer `scripts/export-localstorage.ts` pour exporter données
    - Créer `scripts/import-postgres.ts` pour importer PostgreSQL
    - Valider données avant import
    - Gérer relations et contraintes
    - Estimation : 2-3 jours

37. **Implémenter système backup automatique**
    - Fichier : `scripts/`, `docker/`
    - Créer script backup PostgreSQL
    - Configurer backups automatiques (cron)
    - Sauvegarder aussi fichiers uploadés
    - Tester restauration
    - Estimation : 1-2 jours

38. **Implémenter monitoring et alerting**
    - Fichier : `backend/src/`, `docker/`
    - Intégrer outil monitoring (Prometheus, Grafana)
    - Ajouter métriques (CPU, mémoire, requêtes, erreurs)
    - Configurer alertes (erreurs critiques, performance)
    - Dashboard monitoring
    - Estimation : 2-3 jours

---

## 📊 Résumé

- **Total tâches** : 38
- **🔴 CRITIQUE** : 4 tâches
- **🟠 IMPORTANT** : 12 tâches
- **🟡 MOYEN** : 10 tâches
- **🟢 FAIBLE** : 12 tâches

**Estimation totale** : ~10-12 semaines (1 personne à temps plein)

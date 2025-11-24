# Plan de Migration vers ApiClient

## 📊 État Actuel

### Services utilisant LocalClient

#### Hooks (à migrer)
- `useCollections.tsx` : Utilise `localClient` pour les collections
- `useSuggestionVoting.tsx` : Utilise `localClient` pour les votes
- `useResourceSharing.tsx` : Utilise `localClient` pour le partage de ressources
- `useNotifications.tsx` : Utilise `localClient` pour les notifications
- `useResources.tsx` : Utilise `localClient` pour les ressources

#### Composants (à migrer)
- `CreateResourceOverlay.tsx` : Utilise `localClient` pour créer des ressources
- `AdminPanel.tsx` : Utilise `localClient` pour les opérations admin

#### Pages (à migrer)
- `AdminPanel.tsx` : Utilise `localClient` pour la gestion admin
- `HomeUser.tsx` : Peut utiliser `localClient` indirectement

### Services utilisant déjà ApiClient ou client unifié

#### Services (✅ Déjà migrés)
- `templateService.ts` : Utilise `client` (unifié)
- `versioningService.ts` : Utilise `client` (unifié)
- `oauthAccountService.ts` : Utilise `restApi` (ApiClient)
- `googleDriveService.ts` : Utilise `restApi` (ApiClient)
- `githubService.ts` : Utilise `restApi` (ApiClient)

## 🎯 Plan de Migration

### Phase 1 : Migration des Hooks (Priorité Haute)

1. **useResources.tsx**
   - Remplacer `localClient` par `client` (unifié)
   - Tester les requêtes de ressources

2. **useCollections.tsx**
   - Remplacer `localClient` par `client` (unifié)
   - Adapter les requêtes aux endpoints API

3. **useResourceSharing.tsx**
   - Remplacer `localClient` par `restApi` (ApiClient)
   - Utiliser les endpoints `/api/resources/:id/share`

4. **useNotifications.tsx**
   - Remplacer `localClient` par `restApi` (ApiClient)
   - Utiliser les endpoints `/api/notifications`
   - Adapter la subscription WebSocket

5. **useSuggestionVoting.tsx**
   - Remplacer `localClient` par `restApi` (ApiClient)
   - Utiliser les endpoints `/api/suggestions/:id/vote`

### Phase 2 : Migration des Composants (Priorité Moyenne)

1. **CreateResourceOverlay.tsx**
   - Remplacer `localClient` par `restApi` (ApiClient)
   - Utiliser l'endpoint `POST /api/resources`

2. **AdminPanel.tsx**
   - Remplacer `localClient` par `restApi` (ApiClient)
   - Utiliser les endpoints `/api/admin/*`

### Phase 3 : Tests et Validation (Priorité Haute)

1. Tester chaque hook migré individuellement
2. Tester les composants migrés
3. Vérifier que le fallback LocalClient fonctionne toujours en dev
4. Valider que ApiClient est utilisé en production

## 📝 Notes Importantes

- Le `client` unifié dans `/src/integrations/client.ts` gère déjà le fallback automatique
- En production, `ApiClient` est toujours préféré
- En développement, `LocalClient` est utilisé si le backend n'est pas disponible
- Les services utilisant `restApi` utilisent directement `ApiClient`

## ✅ Avantages de la Migration

1. **Cohérence** : Tous les services utilisent la même interface
2. **Performance** : Pas de duplication de logique
3. **Maintenance** : Un seul point de gestion des requêtes
4. **Production** : Utilisation optimale de l'API backend


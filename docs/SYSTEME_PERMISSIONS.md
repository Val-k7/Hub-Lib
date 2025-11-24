# 🔐 Système de Permissions - Documentation Complète

## Vue d'ensemble

Le système de permissions de Hub-Lib a été entièrement refondu pour offrir une gestion granulaire et flexible des accès. Il supporte :
- **5 rôles hiérarchiques** : `guest`, `user`, `moderator`, `admin`, `super_admin`
- **Permissions granulaires** : basées sur `resource:action` (ex: `resource:create`, `user:manage`)
- **Cache multi-niveaux** : localStorage + Redis + TanStack Query
- **Protection de routes** : composant `ProtectedRoute` réutilisable

---

## Architecture

### Backend

#### 1. Base de données (Prisma Schema)

```prisma
enum AppRole {
  super_admin
  admin
  moderator
  user
  guest
}

model Permission {
  id          String
  name        String   @unique  // "resource:read", "user:manage"
  resource    String
  action      String
  description String?
  rolePermissions RolePermission[]
}

model RolePermission {
  role         AppRole
  permissionId String
  assignedAt   DateTime
  permission   Permission @relation(...)
}

model UserRole {
  userId    String
  role      AppRole
  expiresAt DateTime?  // Permissions temporaires
  createdAt DateTime
  updatedAt DateTime
}
```

#### 2. Services Backend

- **`permissionService.ts`** : Logique métier des permissions
  - `hasRole(userId, role)` : Vérifie si l'utilisateur a un rôle
  - `hasPermission(userId, resource, action)` : Vérifie une permission
  - `getUserPermissions(userId)` : Récupère toutes les permissions
  - `canPerformAction(userId, resource, action)` : Vérification complète

- **`roleCacheService.ts`** : Cache Redis pour les rôles/permissions
  - TTL configurable (défaut: 1 heure)
  - Invalidation automatique lors des changements

#### 3. Middleware Backend

- **`middleware/permissions.ts`** :
  - `requirePermission(resource, action)` : Middleware pour protéger les routes
  - `requireRole(role)` : Middleware pour vérifier un rôle
  - `requireOwnership()` : Vérifie la propriété d'une ressource
  - `requireAllPermissions(...)` : Toutes les permissions requises
  - `requireAnyPermission(...)` : Au moins une permission requise

#### 4. Routes API

- **`/api/permissions`** :
  - `GET /permissions` : Liste toutes les permissions
  - `POST /permissions` : Créer une permission
  - `GET /user/:userId` : Permissions d'un utilisateur
  - `POST /assign` : Assigner une permission à un rôle
  - `DELETE /revoke` : Révoquer une permission

---

### Frontend

#### 1. Context et Hooks

**`PermissionsContext.tsx`** :
- Fournit les permissions et rôles de l'utilisateur
- Cache local (localStorage) avec TTL de 1 heure
- Intégration avec TanStack Query pour le cache serveur
- Invalidation automatique lors de la déconnexion

**Hooks disponibles** :
```typescript
// Hook principal
const { userRole, permissions, hasPermission, hasRole, loading } = usePermissions();

// Hooks utilitaires
const isAdmin = useIsAdmin();
const isSuperAdmin = useIsSuperAdmin();
const hasRole = useHasRole('admin');
const hasPermission = useHasPermission('resource', 'create');
```

#### 2. Composant ProtectedRoute

```tsx
// Route nécessitant l'authentification
<ProtectedRoute>
  <MyResources />
</ProtectedRoute>

// Route nécessitant le rôle admin
<ProtectedRoute requiredRole="admin">
  <AdminPanel />
</ProtectedRoute>

// Route nécessitant une permission spécifique
<ProtectedRoute requiredPermission="resource:create">
  <CreateResource />
</ProtectedRoute>
```

#### 3. Types TypeScript

```typescript
type AppRole = 'super_admin' | 'admin' | 'moderator' | 'user' | 'guest';

interface Permission {
  id: string;
  name: string;  // "resource:read"
  resource: string;
  action: string;
  description: string | null;
}

interface UserPermissions {
  userId: string;
  role: AppRole | null;
  permissions: string[];
}
```

---

## Hiérarchie des Rôles

```
super_admin (4) > admin (3) > moderator (2) > user (1) > guest (0)
```

Un utilisateur avec un rôle supérieur hérite automatiquement des permissions des rôles inférieurs.

---

## Utilisation

### Backend

#### Protéger une route avec un rôle

```typescript
import { requireRole } from '@/middleware/permissions';

router.get('/admin/users', 
  requireAuth, 
  requireRole('admin'),
  asyncHandler(getUsers)
);
```

#### Protéger une route avec une permission

```typescript
import { requirePermission } from '@/middleware/permissions';

router.post('/resources',
  requireAuth,
  requirePermission('resource', 'create'),
  asyncHandler(createResource)
);
```

#### Vérifier dans le code

```typescript
import { permissionService } from '@/services/permissionService';

if (await permissionService.hasPermission(userId, 'resource', 'delete')) {
  await deleteResource(resourceId);
}
```

### Frontend

#### Dans un composant

```tsx
import { useIsAdmin, useHasPermission } from '@/hooks/usePermissions';

function MyComponent() {
  const isAdmin = useIsAdmin();
  const canCreate = useHasPermission('resource', 'create');

  return (
    <>
      {isAdmin && <AdminButton />}
      {canCreate && <CreateButton />}
    </>
  );
}
```

#### Protéger une route

```tsx
import { ProtectedRoute } from '@/components/ProtectedRoute';

<Route 
  path="/admin" 
  element={
    <ProtectedRoute requiredRole="admin">
      <AdminPanel />
    </ProtectedRoute>
  } 
/>
```

---

## Migration des Permissions

Un script de migration est disponible pour initialiser les permissions de base :

```bash
cd backend
npm run migrate:permissions
```

Ce script crée :
- Les permissions de base (resource:read, resource:create, etc.)
- Les assignations de permissions aux rôles
- Les rôles par défaut pour les utilisateurs existants

---

## Cache et Performance

### Niveaux de cache

1. **localStorage** (Frontend) : TTL 1 heure
2. **TanStack Query** (Frontend) : staleTime 1h, gcTime 2h
3. **Redis** (Backend) : TTL configurable (défaut: 1 heure)

### Invalidation

Le cache est invalidé automatiquement :
- Lors de la déconnexion de l'utilisateur
- Lors d'un changement de rôle/permission (backend)
- Lors d'un appel à `refreshPermissions()`

---

## Audit Log des Permissions

### Base de données
- Table `permission_audit_logs`
  - `actor_user_id` : utilisateur ayant effectué l'action (nullable)
  - `action` : `PERMISSION_CREATED`, `PERMISSION_ASSIGNED`, `PERMISSION_REVOKED`, etc.
  - `target_role`, `permission_id`, `permission_name`
  - `metadata` : détails supplémentaires (JSON)

### Backend
- Service `permissionAuditService.ts`
  - `logAction()` : journalise toutes les modifications critiques
  - `listLogs()` : renvoie les entrées paginées/filtrées
- Intégration automatique dans `permissions.ts` :
  - Création d'une permission
  - Assignation / révocation d'une permission pour un rôle

### API
- `GET /api/permissions/audit`
  - Accès `super_admin` uniquement
  - Filtres disponibles : `page`, `limit`, `action`, `targetRole`, `actorUserId`
  - Renvoie les métadonnées (nom de la permission, rôle cible, acteur, date)

---

## Permissions par ressource

Au-delà des partages, il est désormais possible d’accorder une permission explicite (ex: `resource:update`) à un utilisateur ou à un groupe sur une ressource donnée.

### Base de données
- Table `resource_permissions`
  - `resource_id`, `user_id` (optionnel), `group_id` (optionnel)
  - `permission` : chaîne libre (ex: `resource:update`)
  - `expires_at` : expiration optionnelle

### Backend
- `permissionService` vérifie automatiquement cette table si l’utilisateur ne possède pas la permission globale.
- Trois endpoints REST :
  - `GET /api/resources/:id/permissions`
  - `POST /api/resources/:id/permissions` (owner/admin)
  - `DELETE /api/resources/:id/permissions/:permissionId`

### Frontend / UI
- La logique côté UI peut s’appuyer sur les mêmes formulaires que pour les partages (ex: dialog dans `ResourceDetail`).
- À implémenter : gestion graphique de ces permissions dans l’overlay de partage / futur panneau admin des ressources.

---

## Permissions de Base

### Ressources
- `resource:read` : Lire une ressource
- `resource:create` : Créer une ressource
- `resource:update` : Modifier une ressource
- `resource:delete` : Supprimer une ressource
- `resource:publish` : Publier une ressource

### Utilisateurs
- `user:read` : Voir les profils utilisateurs
- `user:update` : Modifier son propre profil
- `user:manage` : Gérer tous les utilisateurs (admin)

### Suggestions
- `suggestion:create` : Proposer une suggestion
- `suggestion:vote` : Voter sur une suggestion
- `suggestion:moderate` : Modérer les suggestions (moderator+)

### Administration
- `admin:access` : Accéder au panneau admin
- `admin:config` : Modifier la configuration (super_admin)

---

## Exemples d'Intégration

### Exemple 1 : Bouton conditionnel

```tsx
import { useHasPermission } from '@/hooks/usePermissions';

function ResourceActions({ resourceId }: { resourceId: string }) {
  const canEdit = useHasPermission('resource', 'update');
  const canDelete = useHasPermission('resource', 'delete');

  return (
    <div>
      {canEdit && <EditButton resourceId={resourceId} />}
      {canDelete && <DeleteButton resourceId={resourceId} />}
    </div>
  );
}
```

### Exemple 2 : Route protégée avec redirection

```tsx
<ProtectedRoute 
  requiredRole="moderator"
  redirectTo="/unauthorized"
  loadingMessage="Vérification des droits d'accès..."
>
  <ModerationPanel />
</ProtectedRoute>
```

### Exemple 3 : Vérification multiple

```tsx
import { usePermissions } from '@/hooks/usePermissions';

function ComplexComponent() {
  const { hasPermission, hasRole } = usePermissions();
  
  const canModerate = hasPermission('suggestion', 'moderate');
  const isModerator = hasRole('moderator');
  
  // Logique conditionnelle...
}
```

---

## Dépannage

### Les permissions ne se chargent pas

1. Vérifier que `PermissionsProvider` est bien dans `main.tsx`
2. Vérifier que l'utilisateur est authentifié
3. Vérifier les logs du backend pour les erreurs API
4. Vider le cache localStorage : `localStorage.removeItem('hub-lib-permissions')`

### Les permissions sont incorrectes

1. Vérifier le rôle de l'utilisateur dans la base de données
2. Vérifier les assignations de permissions dans `RolePermission`
3. Invalider le cache Redis : `redis-cli FLUSHDB` (attention !)
4. Appeler `refreshPermissions()` dans le frontend

### Erreur "usePermissions must be used within PermissionsProvider"

Assurez-vous que `PermissionsProvider` enveloppe votre application dans `main.tsx` :

```tsx
<AuthProvider>
  <PermissionsProvider>
    <App />
  </PermissionsProvider>
</AuthProvider>
```

---

## Évolutions Futures

- [ ] Permissions au niveau des ressources individuelles
- [ ] Groupes de permissions personnalisés
- [x] Audit log des changements de permissions
- [ ] Interface admin pour gérer les permissions
- [ ] Permissions basées sur des conditions (ex: propriétaire de la ressource)

---

## Support

Pour toute question ou problème, consultez :
- Le code source : `backend/src/services/permissionService.ts`
- Les tests : `backend/src/test/permissions.test.ts`
- La documentation API : `/api/docs` (Swagger)


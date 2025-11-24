# 🔐 Plan de Mise à Jour Avancée - Système de Permissions et Rôles

**Date** : 2024  
**Priorité** : 🔴 CRITIQUE

---

## 📋 Analyse des Problèmes Identifiés

### 1. **Problèmes de Synchronisation Frontend/Backend**
- ❌ Le hook `useUserRole` fait un appel API à chaque rendu, causant des problèmes de performance
- ❌ Pas de cache côté frontend pour les rôles et permissions
- ❌ Désynchronisation possible entre le token JWT et les données utilisateur
- ❌ Le rôle n'est pas inclus dans le token JWT de manière fiable

### 2. **Problèmes de Structure de Données**
- ❌ Incohérence entre `user.id` (frontend) et `user_id` (backend)
- ❌ Le filtre `r.user_id === user?.id` peut échouer si les IDs ne correspondent pas
- ❌ Pas de vérification systématique de la structure des données utilisateur

### 3. **Problèmes de Permissions Granulaires**
- ❌ Seulement 2 rôles : `admin` et `user` (trop basique)
- ❌ Pas de système de permissions par ressource
- ❌ Pas de gestion des permissions temporaires ou conditionnelles
- ❌ Pas de système de groupes avec permissions spécifiques

### 4. **Problèmes de Sécurité**
- ❌ Vérification de rôle uniquement côté backend, pas de protection frontend
- ❌ Pas de middleware de permissions pour les routes frontend
- ❌ Risque d'exposition de données sensibles si le frontend ne vérifie pas les permissions

### 5. **Problèmes de Performance**
- ❌ Appels API répétés pour vérifier les rôles
- ❌ Pas de cache Redis pour les rôles utilisateur
- ❌ Requêtes multiples pour récupérer les mêmes informations

---

## 🎯 Objectifs de la Mise à Jour

### Objectifs Principaux
1. ✅ Système de permissions granulaire et flexible
2. ✅ Cache efficace des rôles et permissions
3. ✅ Synchronisation fiable frontend/backend
4. ✅ Performance optimisée
5. ✅ Sécurité renforcée

---

## 📐 Architecture Proposée

### 1. **Système de Rôles Hiérarchique**

```
Super Admin (super_admin)
  └── Admin (admin)
      └── Moderator (moderator)
          └── User (user)
              └── Guest (guest)
```

### 2. **Système de Permissions par Ressource**

```typescript
interface Permission {
  resource: string;        // 'resource', 'template', 'suggestion', etc.
  action: string;          // 'read', 'write', 'delete', 'share', etc.
  conditions?: {
    owner?: boolean;        // Seulement pour le propriétaire
    public?: boolean;       // Seulement si public
    shared?: boolean;       // Seulement si partagé
  };
}
```

### 3. **Cache Multi-Niveaux**

```
Frontend (React Context + LocalStorage)
  └── Backend (Redis Cache)
      └── Database (PostgreSQL)
```

---

## 🔧 Plan d'Implémentation

### Phase 1 : Backend - Système de Permissions Avancé

#### 1.1 Mise à Jour du Schéma Prisma

```prisma
// Nouveau modèle pour les permissions
model Permission {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   @unique
  resource    String   // 'resource', 'template', 'suggestion', etc.
  action      String   // 'read', 'write', 'delete', 'share', etc.
  description String?  @db.Text
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  rolePermissions RolePermission[]

  @@map("permissions")
}

// Lien entre rôles et permissions
model RolePermission {
  id           String     @id @default(uuid()) @db.Uuid
  role         AppRole
  permissionId String     @map("permission_id") @db.Uuid
  createdAt    DateTime   @default(now()) @map("created_at") @db.Timestamptz(6)

  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([role, permissionId])
  @@map("role_permissions")
}

// Extension du modèle UserRole
model UserRole {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @unique @map("user_id") @db.Uuid
  role      AppRole  @default(user)
  expiresAt DateTime? @map("expires_at") @db.Timestamptz(6) // Pour permissions temporaires
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)

  profile Profile @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@index([userId], map: "idx_user_roles_user_id")
  @@index([role], map: "idx_user_roles_role")
  @@map("user_roles")
}

// Extension de l'enum AppRole
enum AppRole {
  super_admin
  admin
  moderator
  user
  guest
  @@map("app_role")
}
```

#### 1.2 Service de Permissions

**Fichier** : `backend/src/services/permissionService.ts`

```typescript
class PermissionService {
  // Vérifier si un utilisateur a une permission spécifique
  async hasPermission(userId: string, resource: string, action: string): Promise<boolean>;
  
  // Vérifier si un utilisateur a un rôle spécifique
  async hasRole(userId: string, role: AppRole): Promise<boolean>;
  
  // Obtenir toutes les permissions d'un utilisateur
  async getUserPermissions(userId: string): Promise<Permission[]>;
  
  // Obtenir le rôle d'un utilisateur (avec cache)
  async getUserRole(userId: string): Promise<AppRole | null>;
  
  // Vérifier les permissions avec conditions
  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    context?: { resourceId?: string; ownerId?: string; isPublic?: boolean }
  ): Promise<boolean>;
}
```

#### 1.3 Middleware de Permissions Avancé

**Fichier** : `backend/src/middleware/permissions.ts`

```typescript
// Middleware pour vérifier les permissions
export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Vérifier la permission avec contexte
    const hasPermission = await permissionService.checkPermission(
      req.user.userId,
      resource,
      action,
      {
        resourceId: req.params.id,
        ownerId: req.body.userId,
        isPublic: req.body.visibility === 'public',
      }
    );

    if (!hasPermission) {
      res.status(403).json({
        error: 'Permission insuffisante',
        code: 'INSUFFICIENT_PERMISSION',
        required: { resource, action },
      });
      return;
    }

    next();
  };
};
```

#### 1.4 Cache Redis pour Rôles et Permissions

**Fichier** : `backend/src/services/roleCacheService.ts`

```typescript
class RoleCacheService {
  // Cache le rôle d'un utilisateur
  async cacheUserRole(userId: string, role: AppRole, ttl: number = 3600): Promise<void>;
  
  // Récupère le rôle depuis le cache
  async getCachedUserRole(userId: string): Promise<AppRole | null>;
  
  // Invalide le cache d'un utilisateur
  async invalidateUserRole(userId: string): Promise<void>;
  
  // Cache les permissions d'un utilisateur
  async cacheUserPermissions(userId: string, permissions: Permission[], ttl: number = 3600): Promise<void>;
  
  // Récupère les permissions depuis le cache
  async getCachedUserPermissions(userId: string): Promise<Permission[] | null>;
}
```

#### 1.5 Mise à Jour du Token JWT

Inclure le rôle et les permissions principales dans le token JWT :

```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: AppRole;
  permissions?: string[]; // Permissions principales en cache
}
```

### Phase 2 : Frontend - Système de Permissions

#### 2.1 Context de Permissions

**Fichier** : `src/contexts/PermissionsContext.tsx`

```typescript
interface PermissionsContextType {
  userRole: AppRole | null;
  permissions: Permission[];
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (role: AppRole) => boolean;
  loading: boolean;
  refreshPermissions: () => Promise<void>;
}

export const PermissionsProvider: React.FC<{ children: ReactNode }>;
export const usePermissions: () => PermissionsContextType;
```

#### 2.2 Hook de Permissions Optimisé

**Fichier** : `src/hooks/usePermissions.tsx`

```typescript
export const usePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Utiliser le cache local (LocalStorage) pour éviter les appels répétés
  // Recharger seulement si le cache est expiré ou si l'utilisateur change

  return {
    userRole,
    permissions,
    hasPermission: (resource: string, action: string) => boolean,
    hasRole: (role: AppRole) => boolean,
    loading,
    refreshPermissions: async () => void,
  };
};
```

#### 2.3 Composant de Protection de Route

**Fichier** : `src/components/ProtectedRoute.tsx`

```typescript
interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole;
  requiredPermission?: { resource: string; action: string };
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps>;
```

#### 2.4 Composant de Protection d'Élément

**Fichier** : `src/components/ProtectedElement.tsx`

```typescript
interface ProtectedElementProps {
  children: ReactNode;
  requiredRole?: AppRole;
  requiredPermission?: { resource: string; action: string };
  fallback?: ReactNode;
  hideIfUnauthorized?: boolean;
}

export const ProtectedElement: React.FC<ProtectedElementProps>;
```

### Phase 3 : Synchronisation et Cache

#### 3.1 Service de Synchronisation

**Fichier** : `src/services/permissionSyncService.ts`

```typescript
class PermissionSyncService {
  // Synchroniser les permissions depuis le backend
  async syncPermissions(): Promise<void>;
  
  // Vérifier si le cache est expiré
  isCacheExpired(): boolean;
  
  // Invalider le cache local
  invalidateCache(): void;
  
  // Recharger les permissions depuis le backend
  async refreshPermissions(): Promise<void>;
}
```

#### 3.2 Cache Local (LocalStorage)

```typescript
interface CachedPermissions {
  userRole: AppRole;
  permissions: Permission[];
  cachedAt: number;
  expiresAt: number;
}
```

### Phase 4 : Migration et Données Initiales

#### 4.1 Script de Migration

**Fichier** : `backend/src/scripts/migratePermissions.ts`

- Créer les permissions de base
- Assigner les permissions aux rôles existants
- Migrer les utilisateurs existants vers le nouveau système

#### 4.2 Permissions de Base

```typescript
const BASE_PERMISSIONS = [
  // Ressources
  { resource: 'resource', action: 'read', roles: ['user', 'moderator', 'admin', 'super_admin'] },
  { resource: 'resource', action: 'write', roles: ['user', 'moderator', 'admin', 'super_admin'] },
  { resource: 'resource', action: 'delete', roles: ['moderator', 'admin', 'super_admin'] },
  { resource: 'resource', action: 'share', roles: ['user', 'moderator', 'admin', 'super_admin'] },
  
  // Templates
  { resource: 'template', action: 'read', roles: ['user', 'moderator', 'admin', 'super_admin'] },
  { resource: 'template', action: 'write', roles: ['user', 'moderator', 'admin', 'super_admin'] },
  { resource: 'template', action: 'delete', roles: ['moderator', 'admin', 'super_admin'] },
  
  // Suggestions
  { resource: 'suggestion', action: 'read', roles: ['user', 'moderator', 'admin', 'super_admin'] },
  { resource: 'suggestion', action: 'write', roles: ['user', 'moderator', 'admin', 'super_admin'] },
  { resource: 'suggestion', action: 'approve', roles: ['moderator', 'admin', 'super_admin'] },
  { resource: 'suggestion', action: 'delete', roles: ['admin', 'super_admin'] },
  
  // Administration
  { resource: 'admin', action: 'access', roles: ['admin', 'super_admin'] },
  { resource: 'admin', action: 'manage_users', roles: ['super_admin'] },
  { resource: 'admin', action: 'manage_roles', roles: ['super_admin'] },
];
```

---

## 📊 Structure des Fichiers à Créer/Modifier

### Backend

```
backend/src/
├── services/
│   ├── permissionService.ts          [NOUVEAU]
│   ├── roleCacheService.ts           [NOUVEAU]
│   └── authService.ts                [MODIFIER - ajouter rôle dans JWT]
├── middleware/
│   ├── permissions.ts                [NOUVEAU]
│   └── auth.ts                       [MODIFIER - améliorer vérification]
├── routes/
│   └── permissions.ts                [NOUVEAU - routes pour gérer permissions]
└── scripts/
    └── migratePermissions.ts         [NOUVEAU]
```

### Frontend

```
src/
├── contexts/
│   └── PermissionsContext.tsx        [NOUVEAU]
├── hooks/
│   ├── usePermissions.tsx            [NOUVEAU - remplacer useUserRole]
│   └── useUserRole.tsx               [MODIFIER - utiliser cache]
├── components/
│   ├── ProtectedRoute.tsx             [NOUVEAU]
│   └── ProtectedElement.tsx          [NOUVEAU]
└── services/
    └── permissionSyncService.ts       [NOUVEAU]
```

---

## 🚀 Ordre d'Implémentation Recommandé

### Étape 1 : Backend - Base de Données (1-2 jours)
1. ✅ Créer la migration Prisma pour les nouvelles tables
2. ✅ Créer le script de migration des données
3. ✅ Tester la migration

### Étape 2 : Backend - Services (2-3 jours)
1. ✅ Implémenter `permissionService.ts`
2. ✅ Implémenter `roleCacheService.ts`
3. ✅ Mettre à jour `authService.ts` pour inclure le rôle dans le JWT
4. ✅ Tester les services

### Étape 3 : Backend - Middleware et Routes (1-2 jours)
1. ✅ Implémenter `permissions.ts` middleware
2. ✅ Créer les routes `/api/permissions`
3. ✅ Mettre à jour les routes existantes pour utiliser les nouveaux middlewares
4. ✅ Tester les routes

### Étape 4 : Frontend - Context et Hooks (2-3 jours)
1. ✅ Créer `PermissionsContext.tsx`
2. ✅ Créer `usePermissions.tsx`
3. ✅ Mettre à jour `useUserRole.tsx` pour utiliser le cache
4. ✅ Tester les hooks

### Étape 5 : Frontend - Composants (1-2 jours)
1. ✅ Créer `ProtectedRoute.tsx`
2. ✅ Créer `ProtectedElement.tsx`
3. ✅ Mettre à jour les routes dans `App.tsx`
4. ✅ Tester les composants

### Étape 6 : Frontend - Intégration (2-3 jours)
1. ✅ Intégrer le système de permissions dans tous les composants
2. ✅ Mettre à jour `HomeUser.tsx` pour utiliser les permissions
3. ✅ Mettre à jour `AdminPanel.tsx` pour utiliser les permissions
4. ✅ Tester l'intégration complète

### Étape 7 : Tests et Optimisation (2-3 jours)
1. ✅ Tests unitaires pour les services
2. ✅ Tests d'intégration pour les routes
3. ✅ Tests E2E pour le frontend
4. ✅ Optimisation des performances
5. ✅ Documentation

---

## 🔒 Sécurité

### Mesures de Sécurité Implémentées

1. **Vérification Backend Obligatoire**
   - Toutes les vérifications de permissions doivent être faites côté backend
   - Le frontend ne fait que masquer/afficher des éléments UI

2. **Cache Sécurisé**
   - Le cache Redis expire automatiquement
   - Invalidation du cache lors des changements de rôle

3. **Token JWT Sécurisé**
   - Le rôle est inclus dans le token mais vérifié côté backend
   - Les permissions ne sont pas dans le token (trop volumineux)

4. **Rate Limiting**
   - Limitation des appels API pour les vérifications de permissions

---

## 📈 Métriques de Succès

### Performance
- ✅ Réduction de 80% des appels API pour les vérifications de rôles
- ✅ Temps de réponse < 50ms pour les vérifications de permissions (avec cache)
- ✅ Cache hit rate > 90%

### Sécurité
- ✅ 100% des vérifications de permissions côté backend
- ✅ 0 fuite de données sensibles
- ✅ Tous les tests de sécurité passent

### Expérience Utilisateur
- ✅ Pas de délai perceptible lors de la vérification des permissions
- ✅ Interface utilisateur réactive
- ✅ Messages d'erreur clairs pour les permissions insuffisantes

---

## 🐛 Problèmes Actuels à Résoudre

### 1. Erreur `myResources is not defined`
- **Cause** : Problème de synchronisation des données utilisateur
- **Solution** : Utiliser le système de permissions pour vérifier l'accès aux ressources

### 2. Problèmes de Permission à la Connexion
- **Cause** : Le rôle n'est pas correctement récupéré ou mis en cache
- **Solution** : Implémenter le cache et la synchronisation

### 3. Performance lors de la Vérification des Rôles
- **Cause** : Appels API répétés
- **Solution** : Cache multi-niveaux (Frontend + Redis)

---

## 📝 Notes Importantes

1. **Rétrocompatibilité** : Le système actuel doit continuer de fonctionner pendant la migration
2. **Migration Progressive** : Implémenter par phases pour éviter les ruptures
3. **Tests** : Tester chaque phase avant de passer à la suivante
4. **Documentation** : Documenter toutes les nouvelles APIs et composants

---

## ✅ Checklist de Validation

### Backend
- [ ] Migration Prisma créée et testée
- [ ] `permissionService.ts` implémenté et testé
- [ ] `roleCacheService.ts` implémenté et testé
- [ ] Middleware `permissions.ts` implémenté et testé
- [ ] Routes `/api/permissions` créées et testées
- [ ] JWT inclut le rôle de manière fiable
- [ ] Cache Redis fonctionne correctement

### Frontend
- [ ] `PermissionsContext.tsx` créé et testé
- [ ] `usePermissions.tsx` créé et testé
- [ ] `ProtectedRoute.tsx` créé et testé
- [ ] `ProtectedElement.tsx` créé et testé
- [ ] Cache LocalStorage fonctionne correctement
- [ ] Synchronisation avec le backend fonctionne

### Intégration
- [ ] Toutes les routes protégées utilisent le nouveau système
- [ ] Tous les composants utilisent les permissions
- [ ] Les tests E2E passent
- [ ] Performance optimale
- [ ] Documentation complète

---

**Statut** : 📋 Planifié  
**Priorité** : 🔴 CRITIQUE  
**Estimation** : 12-18 jours de développement


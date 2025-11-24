/**
 * Types pour le système de permissions
 */

// Utiliser AppRole depuis index.ts pour cohérence
import type { AppRole } from './index';

// Réexporter pour faciliter l'import
export type { AppRole };

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
}

export interface UserPermissions {
  userId: string;
  role: AppRole | null;
  permissions: string[];
}

export interface PermissionCheck {
  hasPermission: boolean;
  resource: string;
  action: string;
}


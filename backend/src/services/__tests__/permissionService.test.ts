/**
 * Tests unitaires pour permissionService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { permissionService } from '../permissionService.js';
import { roleCacheService } from '../roleCacheService.js';
import { prisma } from '../../config/database.js';
import { AppRole } from '@prisma/client';

// Mock des dépendances
vi.mock('../../config/database.js');
vi.mock('../roleCacheService.js');
vi.mock('../../utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('PermissionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasRole', () => {
    it('devrait retourner true si l\'utilisateur a le rôle requis', async () => {
      const userId = 'user-123';
      const role: AppRole = 'admin';

      vi.mocked(roleCacheService.getCachedUserRole).mockResolvedValue(null);
      vi.mocked(prisma.userRole.findUnique).mockResolvedValue({
        id: 'role-123',
        userId,
        role: 'admin',
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await permissionService.hasRole(userId, role);
      expect(result).toBe(true);
    });

    it('devrait retourner false si l\'utilisateur n\'a pas le rôle requis', async () => {
      const userId = 'user-123';
      const role: AppRole = 'admin';

      vi.mocked(roleCacheService.getCachedUserRole).mockResolvedValue(null);
      vi.mocked(prisma.userRole.findUnique).mockResolvedValue({
        id: 'role-123',
        userId,
        role: 'user',
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await permissionService.hasRole(userId, role);
      expect(result).toBe(false);
    });

    it('devrait utiliser le cache si disponible', async () => {
      const userId = 'user-123';
      const role: AppRole = 'admin';

      vi.mocked(roleCacheService.getCachedUserRole).mockResolvedValue('admin');

      const result = await permissionService.hasRole(userId, role);
      expect(result).toBe(true);
      expect(prisma.userRole.findUnique).not.toHaveBeenCalled();
    });

    it('devrait retourner false si le rôle a expiré', async () => {
      const userId = 'user-123';
      const role: AppRole = 'admin';

      vi.mocked(roleCacheService.getCachedUserRole).mockResolvedValue(null);
      vi.mocked(prisma.userRole.findUnique).mockResolvedValue({
        id: 'role-123',
        userId,
        role: 'admin',
        expiresAt: new Date(Date.now() - 1000), // Expiré
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await permissionService.hasRole(userId, role);
      expect(result).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('devrait retourner true si l\'utilisateur a la permission', async () => {
      const userId = 'user-123';
      const resource = 'resource';
      const action = 'create';

      vi.mocked(roleCacheService.getCachedUserPermissions).mockResolvedValue([
        'resource:create',
        'resource:read',
      ]);

      const result = await permissionService.hasPermission(userId, resource, action);
      expect(result).toBe(true);
    });

    it('devrait retourner false si l\'utilisateur n\'a pas la permission', async () => {
      const userId = 'user-123';
      const resource = 'resource';
      const action = 'delete';

      vi.mocked(roleCacheService.getCachedUserPermissions).mockResolvedValue([
        'resource:create',
        'resource:read',
      ]);

      const result = await permissionService.hasPermission(userId, resource, action);
      expect(result).toBe(false);
    });
  });

  describe('getUserRole', () => {
    it('devrait retourner le rôle de l\'utilisateur', async () => {
      const userId = 'user-123';

      vi.mocked(roleCacheService.getCachedUserRole).mockResolvedValue(null);
      vi.mocked(prisma.userRole.findUnique).mockResolvedValue({
        id: 'role-123',
        userId,
        role: 'admin',
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await permissionService.getUserRole(userId);
      expect(result).toBe('admin');
    });

    it('devrait retourner null si l\'utilisateur n\'a pas de rôle', async () => {
      const userId = 'user-123';

      vi.mocked(roleCacheService.getCachedUserRole).mockResolvedValue(null);
      vi.mocked(prisma.userRole.findUnique).mockResolvedValue(null);

      const result = await permissionService.getUserRole(userId);
      expect(result).toBeNull();
    });
  });
});


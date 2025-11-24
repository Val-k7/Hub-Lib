/**
 * Tests pour les hooks de permissions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePermissions, useHasRole, useHasPermission, useIsAdmin } from '../usePermissions';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock de l'API
vi.mock('@/api/rest', () => ({
  restApi: {
    get: vi.fn(),
  },
}));

// Mock du localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as unknown as Storage;

describe('usePermissions', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PermissionsProvider>
            {children}
          </PermissionsProvider>
        </AuthProvider>
      </QueryClientProvider>
    );

    vi.clearAllMocks();
  });

  it('devrait retourner les permissions de l\'utilisateur', async () => {
    const { restApi } = await import('@/api/rest');
    vi.mocked(restApi.get).mockResolvedValue({
      data: {
        userId: 'user-123',
        role: 'admin',
        permissions: ['resource:create', 'resource:read', 'user:manage'],
      },
    });

    const { result } = renderHook(() => usePermissions(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe('admin');
    expect(result.current.permissions).toContain('resource:create');
  });

  it('devrait utiliser le cache localStorage si disponible', async () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        role: 'admin',
        permissions: ['resource:create'],
        timestamp: Date.now(),
      })
    );

    const { result } = renderHook(() => usePermissions(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe('admin');
    // Ne devrait pas appeler l'API si le cache est valide
    expect(vi.mocked(restApi.get)).not.toHaveBeenCalled();
  });
});

describe('useHasRole', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PermissionsProvider>
            {children}
          </PermissionsProvider>
        </AuthProvider>
      </QueryClientProvider>
    );

    vi.clearAllMocks();
  });

  it('devrait retourner true si l\'utilisateur a le rôle requis', async () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        role: 'admin',
        permissions: [],
        timestamp: Date.now(),
      })
    );

    const { result } = renderHook(() => useHasRole('admin'), { wrapper });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('devrait retourner false si l\'utilisateur n\'a pas le rôle requis', async () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        role: 'user',
        permissions: [],
        timestamp: Date.now(),
      })
    );

    const { result } = renderHook(() => useHasRole('admin'), { wrapper });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('devrait respecter la hiérarchie des rôles', async () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        role: 'super_admin',
        permissions: [],
        timestamp: Date.now(),
      })
    );

    const { result } = renderHook(() => useHasRole('admin'), { wrapper });

    await waitFor(() => {
      expect(result.current).toBe(true); // super_admin >= admin
    });
  });
});

describe('useHasPermission', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PermissionsProvider>
            {children}
          </PermissionsProvider>
        </AuthProvider>
      </QueryClientProvider>
    );

    vi.clearAllMocks();
  });

  it('devrait retourner true si l\'utilisateur a la permission', async () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        role: 'admin',
        permissions: ['resource:create', 'resource:read'],
        timestamp: Date.now(),
      })
    );

    const { result } = renderHook(() => useHasPermission('resource', 'create'), { wrapper });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('devrait retourner false si l\'utilisateur n\'a pas la permission', async () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        role: 'user',
        permissions: ['resource:read'],
        timestamp: Date.now(),
      })
    );

    const { result } = renderHook(() => useHasPermission('resource', 'create'), { wrapper });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});

describe('useIsAdmin', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PermissionsProvider>
            {children}
          </PermissionsProvider>
        </AuthProvider>
      </QueryClientProvider>
    );

    vi.clearAllMocks();
  });

  it('devrait retourner true pour un admin', async () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        role: 'admin',
        permissions: [],
        timestamp: Date.now(),
      })
    );

    const { result } = renderHook(() => useIsAdmin(), { wrapper });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('devrait retourner false pour un utilisateur régulier', async () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        role: 'user',
        permissions: [],
        timestamp: Date.now(),
      })
    );

    const { result } = renderHook(() => useIsAdmin(), { wrapper });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});


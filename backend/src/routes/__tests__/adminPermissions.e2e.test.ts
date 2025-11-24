import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../../server.js';
import { prisma } from '../../config/database.js';
import { createTestUser, deleteTestUser, getAuthToken } from '../../test/helpers.js';

describe('E2E - Permissions avancées et journal', () => {
  let superAdmin: Awaited<ReturnType<typeof createTestUser>>;
  let owner: Awaited<ReturnType<typeof createTestUser>>;
  let collaborator: Awaited<ReturnType<typeof createTestUser>>;
  let resource: { id: string };

  beforeEach(async () => {
    superAdmin = await createTestUser({ email: 'sa@test.com', role: 'super_admin' });
    owner = await createTestUser({ email: 'owner@test.com', role: 'user' });
    collaborator = await createTestUser({ email: 'collab@test.com', role: 'user' });

    resource = await prisma.resource.create({
      data: {
        id: uuidv4(),
        userId: owner.userId,
        title: 'Ressource E2E',
        description: 'Test e2e resource permissions',
        tags: [],
        resourceType: 'external_link',
        visibility: 'private',
      },
    });
  });

  afterEach(async () => {
    await prisma.resourcePermission.deleteMany({ where: { resourceId: resource.id } });
    await prisma.resource.delete({ where: { id: resource.id } });
    await deleteTestUser(superAdmin.userId);
    await deleteTestUser(owner.userId);
    await deleteTestUser(collaborator.userId);
  });

  it('permet au propriétaire de gérer les permissions spécifiques de ressource', async () => {
    const ownerToken = owner.accessToken;

    await request(app)
      .get(`/api/resources/${resource.id}/permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const createResponse = await request(app)
      .post(`/api/resources/${resource.id}/permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        userId: collaborator.userId,
        permission: 'resource:update',
      })
      .expect(201);

    expect(createResponse.body).toHaveProperty('permission', 'resource:update');

    const listResponse = await request(app)
      .get(`/api/resources/${resource.id}/permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(listResponse.body).toHaveLength(1);

    await request(app)
      .delete(`/api/resources/${resource.id}/permissions/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const listAfterDelete = await request(app)
      .get(`/api/resources/${resource.id}/permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(listAfterDelete.body).toHaveLength(0);
  });

  it('enregistre les actions dans le journal et les expose via /audit', async () => {
    const saToken = await getAuthToken(superAdmin.userId);
    const permissionName = `test:perm:${Date.now()}`;

    const createPermission = await request(app)
      .post('/api/permissions')
      .set('Authorization', `Bearer ${saToken}`)
      .send({
        name: permissionName,
        resource: 'test',
        action: 'perm',
        description: 'Permission E2E',
      })
      .expect(201);

    await request(app)
      .post('/api/permissions/assign')
      .set('Authorization', `Bearer ${saToken}`)
      .send({
        role: 'moderator',
        permissionId: createPermission.body.data.id,
      })
      .expect(201);

    const auditResponse = await request(app)
      .get('/api/permissions/audit')
      .query({ action: 'PERMISSION_ASSIGNED' })
      .set('Authorization', `Bearer ${saToken}`)
      .expect(200);

    expect(Array.isArray(auditResponse.body.data)).toBe(true);
    const hasEntry = auditResponse.body.data.some(
      (entry: any) => entry.permissionName === permissionName && entry.targetRole === 'moderator'
    );
    expect(hasEntry).toBe(true);

    await prisma.rolePermission.deleteMany({ where: { permissionId: createPermission.body.data.id } });
    await prisma.permissionAuditLog.deleteMany({ where: { permissionName } });
    await prisma.permission.delete({ where: { id: createPermission.body.data.id } });
  });
});


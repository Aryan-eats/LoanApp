import { describe, expect, it } from 'vitest';
import {
  defaultRolePermissions,
  hasRolePermission,
  normalizeRolePermissions,
} from '../services/adminPermissions.js';

describe('admin permissions', () => {
  it('makes viewer read-only for leads, partners, and banks', () => {
    expect(hasRolePermission(defaultRolePermissions.viewer, 'leads', 'read')).toBe(true);
    expect(hasRolePermission(defaultRolePermissions.viewer, 'partners', 'read')).toBe(true);
    expect(hasRolePermission(defaultRolePermissions.viewer, 'banks', 'read')).toBe(true);
    expect(hasRolePermission(defaultRolePermissions.viewer, 'leads', 'update')).toBe(false);
    expect(hasRolePermission(defaultRolePermissions.viewer, 'partners', 'delete')).toBe(false);
    expect(hasRolePermission(defaultRolePermissions.viewer, 'banks', 'create')).toBe(false);
  });

  it('lets super_admin manage role permissions', () => {
    expect(hasRolePermission(defaultRolePermissions.super_admin, 'roles', 'create')).toBe(true);
    expect(hasRolePermission(defaultRolePermissions.super_admin, 'roles', 'read')).toBe(true);
    expect(hasRolePermission(defaultRolePermissions.super_admin, 'roles', 'update')).toBe(true);
    expect(hasRolePermission(defaultRolePermissions.super_admin, 'roles', 'delete')).toBe(true);
  });

  it('normalizes permission payloads to known resources and actions only', () => {
    expect(normalizeRolePermissions({
      leads: { read: true, update: true, export: true },
      settings: { read: true },
    })).toEqual({
      leads: { read: true, create: false, update: true, delete: false },
      partners: { read: false, create: false, update: false, delete: false },
      banks: { read: false, create: false, update: false, delete: false },
      users: { read: false, create: false, update: false, delete: false },
      roles: { read: false, create: false, update: false, delete: false },
    });
  });
});

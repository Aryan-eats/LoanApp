import type { UserRole } from '@prisma/client';
import { Prisma } from '@prisma/client';
import prisma from '../../shared/db/prisma.js';

export const ADMIN_ROLES = ['super_admin', 'admin', 'manager', 'agent', 'viewer'] as const;
export const PERMISSION_RESOURCES = ['leads', 'partners', 'banks', 'users', 'roles'] as const;
export const PERMISSION_ACTIONS = ['read', 'create', 'update', 'delete'] as const;

export type AdminRole = typeof ADMIN_ROLES[number];
export type PermissionResource = typeof PERMISSION_RESOURCES[number];
export type PermissionAction = typeof PERMISSION_ACTIONS[number];
export type ResourcePermissions = Record<PermissionAction, boolean>;
export type RolePermissions = Record<PermissionResource, ResourcePermissions>;

const emptyPermissions = (): RolePermissions =>
  Object.fromEntries(
    PERMISSION_RESOURCES.map((resource) => [
      resource,
      Object.fromEntries(PERMISSION_ACTIONS.map((action) => [action, false])),
    ])
  ) as RolePermissions;

const allow = (
  base: RolePermissions,
  resources: readonly PermissionResource[],
  actions: readonly PermissionAction[]
): RolePermissions => {
  for (const resource of resources) {
    for (const action of actions) {
      base[resource][action] = true;
    }
  }
  return base;
};

export const defaultRolePermissions: Record<AdminRole, RolePermissions> = {
  super_admin: allow(emptyPermissions(), PERMISSION_RESOURCES, PERMISSION_ACTIONS),
  admin: allow(emptyPermissions(), ['leads', 'partners', 'banks'], PERMISSION_ACTIONS),
  manager: allow(emptyPermissions(), ['leads', 'partners', 'banks'], ['read', 'update']),
  agent: allow(emptyPermissions(), ['leads'], ['read', 'create', 'update']),
  viewer: allow(emptyPermissions(), ['leads', 'partners', 'banks'], ['read']),
};

export const isAdminRole = (role: UserRole | string): role is AdminRole =>
  (ADMIN_ROLES as readonly string[]).includes(role);

export const normalizeRolePermissions = (input: unknown): RolePermissions => {
  const normalized = emptyPermissions();
  if (!input || typeof input !== 'object') return normalized;

  const candidate = input as Record<string, unknown>;
  for (const resource of PERMISSION_RESOURCES) {
    const resourceValue = candidate[resource];
    if (!resourceValue || typeof resourceValue !== 'object') continue;

    const actions = resourceValue as Record<string, unknown>;
    for (const action of PERMISSION_ACTIONS) {
      normalized[resource][action] = actions[action] === true;
    }
  }

  return normalized;
};

export const hasRolePermission = (
  permissions: RolePermissions,
  resource: PermissionResource,
  action: PermissionAction
): boolean => Boolean(permissions[resource]?.[action]);

const rowToPermissions = (row: { permissions: Prisma.JsonValue }): RolePermissions =>
  normalizeRolePermissions(row.permissions);

export const getRolePermissions = async (role: AdminRole): Promise<RolePermissions> => {
  const rows = await prisma.$queryRaw<Array<{ permissions: Prisma.JsonValue }>>`
    SELECT permissions FROM role_permissions WHERE role = ${role}::"UserRole" LIMIT 1
  `;
  return rows[0] ? rowToPermissions(rows[0]) : defaultRolePermissions[role];
};

export const listRolePermissions = async (): Promise<Record<AdminRole, RolePermissions>> => {
  const rows = await prisma.$queryRaw<Array<{ role: AdminRole; permissions: Prisma.JsonValue }>>`
    SELECT role::text AS role, permissions FROM role_permissions
  `;
  const merged = { ...defaultRolePermissions };
  for (const row of rows) {
    if (isAdminRole(row.role)) {
      merged[row.role] = normalizeRolePermissions(row.permissions);
    }
  }
  return merged;
};

export const setRolePermissions = async (
  role: AdminRole,
  permissions: unknown,
  updatedBy: string | null
): Promise<RolePermissions> => {
  const normalized = normalizeRolePermissions(permissions);
  await prisma.$executeRaw`
    INSERT INTO role_permissions (role, permissions, updated_by)
    VALUES (${role}::"UserRole", ${JSON.stringify(normalized)}::jsonb, ${updatedBy}::uuid)
    ON CONFLICT (role) DO UPDATE SET
      permissions = EXCLUDED.permissions,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
  `;
  return normalized;
};

export const userHasPermission = async (
  role: UserRole | string,
  resource: PermissionResource,
  action: PermissionAction
): Promise<boolean> => {
  if (!isAdminRole(role)) return false;
  if (role === 'super_admin') return true;
  return hasRolePermission(await getRolePermissions(role), resource, action);
};

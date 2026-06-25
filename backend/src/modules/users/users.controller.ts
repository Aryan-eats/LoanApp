import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../shared/db/prisma.js';
import { hashPassword } from '../../services/userService.js';
import { sanitizeAdminUserResponse } from '../../services/authService.js';
import { logAuditEvent } from '../audit/auditLogger.js';
import {
  ADMIN_ROLES,
  isAdminRole,
  listRolePermissions,
  setRolePermissions,
  type AdminRole,
} from './adminPermissions.service.js';

// -- Users -------------------------------------------------------------------

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const pageRaw = parseInt(String(req.query.page ?? '1'), 10);
    const limitRaw = parseInt(String(req.query.limit ?? '50'), 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          createdAt: true,
          onboardingStatus: true,
          kycStatus: true,
          partnerType: true,
          city: true,
        },
      }),
      prisma.user.count(),
    ]);

    res.status(200).json({
      success: true,
      count: users.length,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password || !firstName || !lastName || !role) {
      res.status(400).json({
        success: false,
        message: 'Please provide email, password, firstName, lastName, and role',
      });
      return;
    }

    const validRoles = ADMIN_ROLES;
    if (!validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'A user with this email already exists' });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role,
        isActive: true,
        isEmailVerified: true,
        encryptionVersion: 1,
      },
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: sanitizeAdminUserResponse(user) },
    });

    await logAuditEvent('ADMIN_USER_CREATED', req, {
      userId: req.user?.id,
      entityId: user.id,
      entityType: 'user',
      metadata: { email: email.toLowerCase(), role },
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({ success: true, data: { user: sanitizeAdminUserResponse(user) } });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { firstName, lastName, phone, role, isActive, isEmailVerified, isPhoneVerified } = req.body;

    if (role !== undefined && !isAdminRole(role)) {
      res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${ADMIN_ROLES.join(', ')}`,
      });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isEmailVerified !== undefined) updateData.isEmailVerified = isEmailVerified;
    if (isPhoneVerified !== undefined) updateData.isPhoneVerified = isPhoneVerified;

    let user;
    try {
      user = await prisma.user.update({ where: { id }, data: updateData });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }
      throw err;
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user: sanitizeAdminUserResponse(user) },
    });

    // Detect role changes for ADMIN_ROLE_CHANGED
    if (role !== undefined) {
      await logAuditEvent('ADMIN_ROLE_CHANGED', req, {
        userId: req.user?.id,
        entityId: id,
        entityType: 'user',
        severity: 'HIGH',
        metadata: { newRole: role, changedFields: Object.keys(updateData) },
      });
    }
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// -- Roles -------------------------------------------------------------------

export const listRoles = async (_req: Request, res: Response): Promise<void> => {
  try {
    const permissions = await listRolePermissions();
    res.status(200).json({
      success: true,
      data: {
        roles: ADMIN_ROLES.map((role) => ({ role, permissions: permissions[role] })),
      },
    });
  } catch (error) {
    console.error('List roles error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateRolePermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = String(req.params.role);
    if (!isAdminRole(role)) {
      res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${ADMIN_ROLES.join(', ')}`,
      });
      return;
    }

    if (role === 'super_admin') {
      res.status(400).json({ success: false, message: 'Super Admin permissions are fixed' });
      return;
    }

    const permissions = await setRolePermissions(
      role as AdminRole,
      req.body?.permissions,
      req.user?.id ?? null
    );

    res.status(200).json({
      success: true,
      message: 'Role permissions updated successfully',
      data: { role, permissions },
    });

    await logAuditEvent('ADMIN_ROLE_CHANGED', req, {
      userId: req.user?.id,
      entityId: role,
      entityType: 'role',
      severity: 'HIGH',
      metadata: { permissions },
    });
  } catch (error) {
    console.error('Update role permissions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (req.user && user.id === req.user.id) {
      res.status(400).json({ success: false, message: 'You cannot delete your own account from here' });
      return;
    }

    await prisma.user.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'User deleted successfully' });

    await logAuditEvent('ADMIN_USER_DELETED', req, {
      userId: req.user?.id,
      entityId: id,
      entityType: 'user',
      severity: 'HIGH',
      metadata: { deletedEmail: user.email, deletedRole: user.role },
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


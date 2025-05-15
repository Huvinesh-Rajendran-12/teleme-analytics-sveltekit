import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logError } from '$lib/utils/secureLogger';
import * as jose from 'jose';

/**
 * GET /api/users/[id] - Get user by ID (admin only)
 */
export const GET: RequestHandler = async ({ request, params }) => {
  try {
    // Auth check
    const token = request.headers.get('authorization')?.split('Bearer ')[1];
    if (!token) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify admin role or self access
    try {
      const jwtSecret = import.meta.env.VITE_JWT_SECRET;
      if (!jwtSecret) {
        return json({ error: 'Server misconfiguration' }, { status: 500 });
      }

      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jose.jwtVerify(token, secret);

      // Only allow admins or the user themselves to access their data
      if (payload.role !== 'admin' && payload.sub !== params.id) {
        return json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    } catch {
      return json({ error: 'Invalid token' }, { status: 401 });
    }

    // In a real implementation, you would retrieve the user from your database or API
    // For now, we'll return a mock user

    const userId = params.id;
    const mockUser = {
      id: userId,
      username: `user_${userId.substring(0, 5)}`,
      email: `user_${userId.substring(0, 5)}@example.com`,
      role: 'user',
      status: 'active',
      createdAt: new Date(Date.now() - 1000000000).toISOString(),
      lastLogin: new Date().toISOString(),
      organizations: ['Teleme'],
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: true
      }
    };

    return json(mockUser);
  } catch (error) {
    logError('Error getting user:', error);
    return json(
      { error: 'An error occurred while fetching the user' },
      { status: 500 }
    );
  }
};

/**
 * PUT /api/users/[id] - Update user by ID (admin only)
 */
export const PUT: RequestHandler = async ({ request, params }) => {
  try {
    // Auth check
    const token = request.headers.get('authorization')?.split('Bearer ')[1];
    if (!token) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify admin role or self access
    try {
      const jwtSecret = import.meta.env.VITE_JWT_SECRET;
      if (!jwtSecret) {
        return json({ error: 'Server misconfiguration' }, { status: 500 });
      }

      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jose.jwtVerify(token, secret);

      // Only allow admins or the user themselves to update their data
      // And restrict regular users from changing their role
      const userData = await request.json();
      if (payload.role !== 'admin') {
        if (payload.sub !== params.id) {
          return json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Regular users can't change their role
        if (userData.role) {
          return json({ error: 'Cannot change role for your own account' }, { status: 403 });
        }
      }
    } catch {
      return json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse request body
    const userData = await request.json();

    // In a real implementation, you would update the user in your database or API
    // For now, we'll return a mock response

    const userId = params.id;
    const updatedUser = {
      id: userId,
      username: userData.username || `user_${userId.substring(0, 5)}`,
      email: userData.email || `user_${userId.substring(0, 5)}@example.com`,
      role: userData.role || 'user',
      status: userData.status || 'active',
      createdAt: new Date(Date.now() - 1000000000).toISOString(),
      lastLogin: new Date().toISOString(),
      organizations: userData.organizations || ['Teleme'],
      preferences: userData.preferences || {
        theme: 'light',
        language: 'en',
        notifications: true
      }
    };

    return json(updatedUser);
  } catch (error) {
    logError('Error updating user:', error);
    return json(
      { error: 'An error occurred while updating the user' },
      { status: 500 }
    );
  }
};

/**
 * DELETE /api/users/[id] - Delete user by ID (admin only)
 */
export const DELETE: RequestHandler = async ({ request }) => {
  try {
    // Auth check
    const token = request.headers.get('authorization')?.split('Bearer ')[1];
    if (!token) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify admin role
    try {
      const jwtSecret = import.meta.env.VITE_JWT_SECRET;
      if (!jwtSecret) {
        return json({ error: 'Server misconfiguration' }, { status: 500 });
      }

      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jose.jwtVerify(token, secret);

      // Only admins can delete users
      if (payload.role !== 'admin') {
        return json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    } catch (err) {
      return json({ error: 'Invalid token' }, { status: 401 });
    }

    // In a real implementation, you would delete the user from your database or API
    // For now, we'll return a mock success response

    return json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    logError('Error deleting user:', error);
    return json(
      { error: 'An error occurred while deleting the user' },
      { status: 500 }
    );
  }
};

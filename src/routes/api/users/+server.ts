import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logError } from '$lib/utils/secureLogger';
import * as jose from 'jose';

/**
 * GET /api/users - List all users (admin only)
 */
export const GET: RequestHandler = async ({ request, url }) => {
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

      if (payload.role !== 'admin') {
        return json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    } catch {
      return json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');

    // Call n8n webhook to get user list
    // For now, we'll implement a mock response
    // In production, you would call your backend API or database

    const mockUsers = Array.from({ length: pageSize }, (_, i) => ({
      id: `user-${i + 1 + (page - 1) * pageSize}`,
      username: `user${i + 1 + (page - 1) * pageSize}`,
      email: `user${i + 1 + (page - 1) * pageSize}@example.com`,
      role: i === 0 ? 'admin' : 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    }));

    const total = 42; // Mock total count
    const totalPages = Math.ceil(total / pageSize);

    return json({
      users: mockUsers,
      page,
      pageSize,
      total,
      totalPages
    });
  } catch (error) {
    logError('Error listing users:', error);
    return json(
      { error: 'An error occurred while fetching users' },
      { status: 500 }
    );
  }
};

/**
 * POST /api/users - Create a new user (admin only)
 */
export const POST: RequestHandler = async ({ request }) => {
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

      if (payload.role !== 'admin') {
        return json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    } catch {
      return json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse request body
    const userData = await request.json();

    // Validate required fields
    if (!userData.username || !userData.email || !userData.password) {
      return json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    // In a real implementation, you would call your backend API or database
    // For now, we'll return a mock response

    const newUser = {
      id: `user-${Math.random().toString(36).substring(7)}`,
      username: userData.username,
      email: userData.email,
      role: userData.role || 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
      // Don't include password in response
    };

    return json(newUser, { status: 201 });
  } catch (error) {
    logError('Error creating user:', error);
    return json(
      { error: 'An error occurred while creating the user' },
      { status: 500 }
    );
  }
};

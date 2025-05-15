import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logDebug, logError } from '$lib/utils/secureLogger';
import * as jose from 'jose';

/**
 * POST /api/auth/login - User login
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    logDebug('User login endpoint called');
    
    // Parse request body
    const credentials = await request.json();
    const { username, password } = credentials;
    
    // Validate required fields
    if (!username || !password) {
      logDebug('Login failed: Missing username or password');
      return json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    logDebug('Login attempt for username:', username);
    
    // In a real implementation, you would validate against your database
    // For now, we'll implement a mock response with some test users
    
    // Test users (in production, store these in a database with hashed passwords)
    const testUsers = [
      { id: 'user-1', username: 'testuser', password: 'password123', role: 'user', email: 'testuser@example.com' },
      { id: 'user-2', username: 'admin', password: 'admin123', role: 'admin', email: 'admin@example.com' }
    ];
    
    const user = testUsers.find(u => u.username === username && u.password === password);
    
    if (!user) {
      logDebug('Login failed: Invalid credentials');
      return json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      );
    }
    
    // Generate JWT token
    const jwtSecret = import.meta.env.VITE_JWT_SECRET;
    if (!jwtSecret) {
      logError('JWT_SECRET is not set in environment variables');
      return json(
        { success: false, message: 'Server misconfiguration: JWT secret missing.' },
        { status: 500 }
      );
    }
    
    const secret = new TextEncoder().encode(jwtSecret);
    const alg = 'HS256';

    const token = await new jose.SignJWT({
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime('8h') // Token valid for 8 hours
      .sign(secret);
    
    logDebug('Login successful for user:', username);
    
    // Return successful login response with token and user info (minus password)
    const { password: _, ...userWithoutPassword } = user;
    
    return json({
      success: true,
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    logError('Error during user login:', error);
    return json(
      { success: false, message: 'An error occurred during login' },
      { status: 500 }
    );
  }
};
import { json } from '@sveltejs/kit';
import * as jose from 'jose';
import { logDebug, logError } from '$lib/utils/secureLogger';

export async function POST({ request }: {request: Request}) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Log authentication attempt (without sensitive details)
    logDebug('Admin authentication attempt for user:', username);

    // Validate inputs
    if (!username || !password) {
      logError('Admin auth failed: Missing username or password');
      return json({
        success: false,
        message: 'Username and password are required'
      }, { status: 400 });
    }

    // Check against environment variables
    // In production, you would use a more secure authentication method
    const validUsername = import.meta.env.VITE_ADMIN_USERNAME;
    const validPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    const jwtSecret = import.meta.env.VITE_JWT_SECRET;

    if (!validUsername || !validPassword || !jwtSecret) {
      logError('Admin auth error: Missing environment variables for authentication');
      return json({
        success: false,
        message: 'Authentication service is not properly configured'
      }, { status: 500 });
    }

    // Validate credentials
    if (username !== validUsername || password !== validPassword) {
      logError('Admin auth failed: Invalid credentials');
      return json({
        success: false,
        message: 'Invalid credentials'
      }, { status: 401 });
    }

    // Create JWT token
    const secret = new TextEncoder().encode(jwtSecret);
    const alg = 'HS256';

    const token = await new jose.SignJWT({
      sub: username,
      role: 'admin'
    })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime('8h') // Token valid for 8 hours
      .sign(secret);

    logDebug('Admin authentication successful for user:', username);

    return json({
      success: true,
      message: 'Authentication successful',
      token
    });

  } catch (error) {
    logError('Error in admin authentication:', error);
    return json({
      success: false,
      message: 'An error occurred during authentication'
    }, { status: 500 });
  }
}

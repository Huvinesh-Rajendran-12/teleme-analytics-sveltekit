import { json } from '@sveltejs/kit';
import { logError, logInfo, logDebug } from '$lib/utils/secureLogger';
import * as jose from 'jose';
import type { RequestEvent } from './$types';

// Environment variable to store JWT secret (would be properly configured in production)
const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || 'your-secret-key-for-development';

export async function GET({ url, request }: RequestEvent) {
    const authToken = url.searchParams.get('auth_token');
    
    // Try to get token from Authorization header if not in query params
    let token = authToken;
    if (!token) {
        const authHeader = request.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
            logDebug('Found auth token in Authorization header');
        }
    }

    if (!token) {
        logError('API /me: Missing auth_token parameter');
        return json({
            error: 'Authentication token is required'
        }, { status: 400 });
    }

    try {
        // Verify JWT token (in production, this would also check expiration, issuer, etc.)
        const secretKey = new TextEncoder().encode(JWT_SECRET);
        let payload;
        
        try {
            // Verify with jose library
            const result = await jose.jwtVerify(token, secretKey);
            payload = result.payload;
            logDebug('JWT verification successful', { subject: payload.sub });
        } catch (tokenError) {
            logError('JWT verification failed', { error: tokenError });
            
            // If verification fails with jose, fallback to development mode with mock data
            if (import.meta.env.DEV) {
                // In development mode, allow using a specific token for testing
                if (token === 'health-tracker-test-token') {
                    logInfo('Using test token in development mode');
                    payload = {
                        sub: 'test-user',
                        userId: '12345',
                        userName: 'Test User',
                        patientId: 'PT78901',
                        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
                    };
                } else {
                    throw new Error('Invalid token');
                }
            } else {
                throw new Error('Invalid token');
            }
        }

        // Extract user data from payload
        const userData = {
            userId: payload.userId || payload.user_id || payload.sub,
            userName: payload.userName || payload.user_name || 'User',
            patientId: payload.patientId || payload.patient_id,
            // Add any other fields your application needs
        };

        // Make sure we have the minimal required data
        if (!userData.userId || !userData.patientId) {
            logError('API /me: Required fields missing in token payload', { fields: 'userId or patientId' });
            return json({
                error: 'Token is missing required user information'
            }, { status: 401 });
        }

        logInfo('API /me: Successfully authenticated user', { userId: userData.userId });
        return json(userData);
    } catch (error) {
        logError('API /me: Error during authentication', { error });
        return json({
            error: error instanceof Error ? error.message : 'Authentication failed'
        }, { status: 401 });
    }
}
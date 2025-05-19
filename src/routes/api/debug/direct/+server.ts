import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import axios from 'axios';
import { logDebug, logError } from '$lib/utils/secureLogger';

/**
 * GET /api/debug/direct - Debug endpoint that directly calls the N8N webhook with hardcoded URL
 */
export const GET: RequestHandler = async ({ request }) => {
  try {
    // Extract token from authorization header
    const token = request.headers.get('authorization')?.split('Bearer ')[1] || null;
    
    // Use a hardcoded URL to test
    const webhookUrl = "https://teleme-n8n.teleme.co/webhook/ai-admin";
    
    // Prepare URL parameters
    const params = new URLSearchParams({
      action: "list_conversations",
      application: "analytics_chatbot",
      page: "1",
      pageSize: "10",
    });

    // Build the URL with parameters
    const apiUrl = `${webhookUrl}?${params.toString()}`;
    
    // Log debug info
    logDebug("Direct Debug endpoint - Calling hardcoded API:", apiUrl);
    logDebug("Direct Debug endpoint - Token available:", Boolean(token));
    
    // Make the API call without any headers first to test base URL
    let noAuthResponse;
    try {
      noAuthResponse = await axios.get(apiUrl, { timeout: 10000 });
      logDebug("Direct request without auth succeeded, status:", noAuthResponse.status);
    } catch (noAuthError) {
      logError("Direct request without auth failed:", noAuthError);
      noAuthResponse = { status: 'failed', error: noAuthError instanceof Error ? noAuthError.message : String(noAuthError) };
    }
    
    // Now make the call with authentication if token is available
    let authResponse = null;
    if (token) {
      try {
        logDebug("Attempting request with authorization token");
        authResponse = await axios.get(apiUrl, { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        });
        logDebug("Direct request with auth succeeded, status:", authResponse.status);
      } catch (authError) {
        logError("Direct request with auth failed:", authError);
        authResponse = { status: 'failed', error: authError instanceof Error ? authError.message : String(authError) };
      }
    }
    
    // Return both responses for comparison
    return json({
      apiUrl: apiUrl,
      noAuthResult: {
        status: typeof noAuthResponse.status === 'number' ? noAuthResponse.status : 'error',
        data: noAuthResponse.data || noAuthResponse
      },
      authResult: (token && authResponse) ? {
        status: typeof authResponse.status === 'number' ? authResponse.status : 'error',
        data: authResponse.data || authResponse
      } : 'No token provided'
    });
  } catch (error) {
    logError("Direct debug endpoint error:", error);
    return json({
      error: 'An error occurred in the direct debug endpoint',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
};
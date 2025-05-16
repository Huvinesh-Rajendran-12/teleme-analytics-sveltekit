import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import axios from 'axios';
import { logDebug, logError } from '$lib/utils/secureLogger';

/**
 * GET /api/debug/analytics - Debug endpoint to test direct N8N webhook communication
 */
export const GET: RequestHandler = async ({ request, url }) => {
  try {
    // Extract token from authorization header
    const token = request.headers.get('authorization')?.split('Bearer ')[1] || null;
    
    // Get query parameters
    const page = url.searchParams.get('page') || '1';
    const pageSize = url.searchParams.get('pageSize') || '10';
    
    // Use the N8N webhook URL from environment variable
    const N8N_ADMIN_WEBHOOK_URL = import.meta.env.VITE_N8N_ADMIN_WEBHOOK_URL || 
      "https://teleme-n8n.teleme.co/webhook/ai-admin";
    
    // Prepare URL parameters
    const params = new URLSearchParams({
      action: "list_conversations",
      application: "analytics_chatbot",
      page: page,
      pageSize: pageSize,
    });

    // Build the URL with parameters
    const apiUrl = `${N8N_ADMIN_WEBHOOK_URL}?${params.toString()}`;
    
    // Log debug info
    logDebug("Debug endpoint - Calling API:", apiUrl);
    logDebug("Debug endpoint - Token available:", Boolean(token));
    
    // Add authorization header with admin token if available
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Make the API call
    const response = await axios.get(apiUrl, { headers });
    
    // Log response info
    logDebug("Debug endpoint - API response status:", response.status);
    logDebug("Debug endpoint - API response type:", typeof response.data);
    if (Array.isArray(response.data)) {
      logDebug("Debug endpoint - Response is an array with length:", response.data.length);
    }
    
    // Return the raw response data
    return json({
      requestInfo: {
        url: apiUrl,
        headers: headers,
        tokenAvailable: Boolean(token)
      },
      responseInfo: {
        status: response.status,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        arrayLength: Array.isArray(response.data) ? response.data.length : null,
        objectKeys: typeof response.data === 'object' && response.data !== null ? Object.keys(response.data) : null
      },
      data: response.data
    });
  } catch (error) {
    logError("Debug endpoint error:", error);
    return json({
      error: 'An error occurred in the debug endpoint',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
};
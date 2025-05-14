import { json } from '@sveltejs/kit';
import { logInfo } from '$lib/utils/secureLogger';

// Simple health check endpoint that returns a 200 OK status
// This is used by the client-side connection check to determine if the API is available
export const HEAD = () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
};

export const GET = () => {
  logInfo('Health check endpoint accessed');
  
  return json(
    { 
      status: 'ok',
      timestamp: new Date().toISOString()
    },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }
  );
};
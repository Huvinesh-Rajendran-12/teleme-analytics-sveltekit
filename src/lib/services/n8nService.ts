import { logError, logDebug, logInfo } from '$lib/utils/secureLogger';

// Define the response structure for n8n service calls
type N8nServiceResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Configuration options for N8n service
type N8nConfig = {
  baseUrl: string;
  apiKey?: string;
  defaultTimeout?: number;
};

// Default configuration values (would normally come from environment)
const N8N_BASE_URL = '/api'; // Default API endpoint base for SvelteKit
const N8N_API_KEY = ''; // Would come from environment in production
const N8N_ANALYTICS_WEBHOOK_URL = import.meta.env.VITE_N8N_ANALYTICS_WEBHOOK_URL;
const N8N_HEALTH_TRACKER_WEBHOOK_URL = import.meta.env.VITE_N8N_HEALTH_TRACKER_WEBHOOK_URL;
const N8N_ADMIN_WEBHOOK_URL = import.meta.env.VITE_N8N_ADMIN_WEBHOOK_URL;
const N8N_TIMEOUT = 60000; // 60 seconds default timeout

// Track API calls for debugging (using a private counter for security)
let apiCallCount = 0;

// Store the current abort controller for active requests
let currentController: AbortController | null = null;
// Flag to track if abort was user-initiated
let userInitiatedAbort = false;

/**
 * N8n Service class for handling API communications with n8n instances
 */
class N8nService {
  private baseUrl: string;
  private apiKey?: string;
  private defaultTimeout: number;
  private analyticsWebhookUrl?: string;
  private healthTrackerWebhookUrl?: string;
  private adminWebhookUrl?: string;
  private initialized: boolean = false;
  private currentRequests: Map<string, AbortController> = new Map();

  constructor(config?: N8nConfig) {
    // Use provided config or default values
    this.baseUrl = (config?.baseUrl || N8N_BASE_URL).replace(/\/$/, '');
    this.apiKey = config?.apiKey || N8N_API_KEY;
    this.defaultTimeout = config?.defaultTimeout || N8N_TIMEOUT;
    this.analyticsWebhookUrl = N8N_ANALYTICS_WEBHOOK_URL;
    this.healthTrackerWebhookUrl = N8N_HEALTH_TRACKER_WEBHOOK_URL;
    this.adminWebhookUrl = N8N_ADMIN_WEBHOOK_URL;

    // Only log initialization once
    if (!this.initialized) {
      this.initialized = true;
      logInfo('N8n service initialized with base URL:', this.baseUrl);
    }
  }

  /**
   * Call the webhook with params
   */
  async callWithParams(
    sessionId: string,
    userId: string | number,
    userName: string,
    period: number,
    message: string,
    application: string = 'analytics_chatbot',
    is_ngo: boolean | null = null,
    patient_id: string | number | null = null
  ): Promise<N8nServiceResponse<string>> {
    // Track API calls for debugging
    apiCallCount++;
    logDebug('API call initiated', {
      sessionId: '[REDACTED]',
      callCount: apiCallCount
    });

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add API key if provided
      if (this.apiKey) {
        headers['X-N8N-API-KEY'] = this.apiKey;
      }

      // Construct URL - default to analytics webhook if available, otherwise fallback to old path
      let url = '';
      if (application === 'analytics_chatbot') {
        url = this.analyticsWebhookUrl || '';
      } else if (application === 'health_tracker_summary') {
        url = this.healthTrackerWebhookUrl || '';
      }

      logDebug('Calling n8n service', { url });

      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);
      
      // Store the controller with a unique key based on sessionId and message
      const requestKey = `${sessionId}-${Date.now()}`;
      this.currentRequests.set(requestKey, controller);
      // Also store in the global variable for easier access
      currentController = controller;

      // Send request using fetch API
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          sessionId,
          user_id: userId,
          user_name: userName,
          duration: period,
          message,
          ...(is_ngo !== null && { is_ngo }),
          ...(patient_id !== null && { patient_id }),
          application
        }),
        signal: controller.signal
      });

      // Clear the timeout and remove from active requests
      clearTimeout(timeoutId);
      this.currentRequests.delete(requestKey);
      if (currentController === controller) {
        currentController = null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        logError('API response not OK:', { status: response.status, error: errorText });
        return {
          success: false,
          error: `API error: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();

      // Handle various response formats
      let responseData = data?.output?.answer || data?.output?.response || data?.response || data;

      if (!responseData || (typeof responseData === 'string' && responseData.trim() === '')) {
        return {
          success: false,
          error: 'Empty response from server'
        };
      }

      return {
        success: true,
        data: responseData
      };
    } catch (error) {
      logError('N8n webhook error:', error);

      // Handle specific error types
      if (error instanceof Error) {
        // Handle abort/timeout errors
        if (error.name === 'AbortError') {
          // Check if this was a user-initiated abort
          if (userInitiatedAbort) {
            // This was intentionally cancelled by the user, do not treat as an error
            return {
              success: true,
              data: 'Request cancelled by user'
            };
          } else {
            // This was a timeout abort
            return {
              success: false,
              error: 'Connection timed out'
            };
          }
        }
        // Handle network errors
        else if (error.message.includes('network') || error.message.includes('Network Error')) {
          return {
            success: false,
            error:
              "We couldn't connect to the server. Please check your internet connection or try again in a few moments."
          };
        }

        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: false,
        error: 'Unknown error occurred'
      };
    }
  }

  /**
   * Send a message to n8n and get a response
   * @param sessionId - The session ID for the conversation
   * @param message - The message to send
   * @param userId - The user ID
   * @param application - The application type (analytics_chatbot or health_tracker_summary)
   * @param patient_id - Optional patient ID for health tracker operations
   * @returns Promise with the response data
   */
  async sendMessage(
    sessionId: string,
    message: string,
    userId: string | number = '1160',
    application: string = 'analytics_chatbot',
    patient_id?: string | number | null,
    duration?: number | null // Added duration parameter
  ): Promise<N8nServiceResponse<string>> {
    // Track API calls for debugging
    apiCallCount++;
    logDebug('Message API call initiated', {
      sessionId: '[REDACTED]',
      callCount: apiCallCount
    });

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add API key if provided
      if (this.apiKey) {
        headers['X-N8N-API-KEY'] = this.apiKey;
      }

      // Select appropriate webhook URL based on application
      let url;
      if (application === 'analytics_chatbot') {
        url = this.analyticsWebhookUrl;
      } else if (application === 'health_tracker_summary') {
        url = this.healthTrackerWebhookUrl;
      } else {
        // Fallback to default
        url = `${this.baseUrl}/n8n-send-message`;
      }

      if (!url) {
        logError(`No webhook URL available for application: ${application}`);
        return {
          success: false,
          error: `Webhook URL not configured for application: ${application}`
        };
      }

      logDebug('Sending message to n8n', {
        messageFirstChars: message.substring(0, 20) + '...'
      });

      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

      // Store the controller with a unique key based on sessionId and message
      const requestKey = `${sessionId}-${Date.now()}`;
      this.currentRequests.set(requestKey, controller);
      // Also store in the global variable for easier access
      currentController = controller;
      
      // Send request
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          sessionId: sessionId,
          message: message,
          user_id: userId,
          application: application,
          ...(application === 'health_tracker_summary' && patient_id !== null && { patient_id }),
          ...(duration !== null && duration !== undefined && { duration }) // Added duration to body
        }),
        signal: controller.signal
      });

      // Clear the timeout and remove from active requests
      clearTimeout(timeoutId);
      this.currentRequests.delete(requestKey);
      if (currentController === controller) {
        currentController = null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        logError('API response not OK:', { status: response.status, error: errorText });
        return {
          success: false,
          error: `API error: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();

      // Handle various response formats
      let responseData = data?.output?.answer || data?.output?.response || data?.response || data;

      if (!responseData || (typeof responseData === 'string' && responseData.trim() === '')) {
        return {
          success: false,
          error: 'Empty response from server'
        };
      }

      return {
        success: true,
        data: responseData
      };
    } catch (error) {
      logError('N8n webhook error:', error);

      // Handle specific error types
      if (error instanceof Error) {
        // Handle abort/timeout errors
        if (error.name === 'AbortError') {
          // Check if this was a user-initiated abort
          if (userInitiatedAbort) {
            // This was intentionally cancelled by the user, do not treat as an error
            return {
              success: true,
              data: 'Request cancelled by user'
            };
          } else {
            // This was a timeout abort
            return {
              success: false,
              error: 'Connection timed out'
            };
          }
        }
        // Handle network errors
        else if (error.message.includes('network') || error.message.includes('Network Error')) {
          return {
            success: false,
            error:
              "We couldn't connect to the server. Please check your internet connection or try again in a few moments."
          };
        }

        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: false,
        error: 'Unknown error occurred'
      };
    }
  }

  /**
   * Call default webhook with generic payload
   * @param payload - The data to send to the webhook
   * @param path - The path or type of webhook to call
   * @returns Promise with the response data
   */
  async callDefaultWebhook(
    payload: unknown,
    path: string = 'default'
  ): Promise<N8nServiceResponse<string>> {
    // Track API calls for debugging
    apiCallCount++;
    logDebug('N8N API call', {
      callNumber: apiCallCount,
      path,
      payloadPreview: 'Redacted for security'
    });

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (this.apiKey) {
        headers['X-N8N-API-KEY'] = this.apiKey;
      }

      // Use appropriate webhook URL based on path
      let url;
      if (path === 'analytics') {
        url = this.analyticsWebhookUrl;
      } else if (path === 'admin') {
        url = this.adminWebhookUrl;
      } else {
        url = `${this.baseUrl}/${path}`;
      }

      if (!url) {
        logError('No webhook URL available for path', { path });
        return {
          success: false,
          error: `Webhook URL not configured for: ${path}`
        };
      }

      logDebug('Calling default webhook', { url });

      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

      // Store the controller with a unique key
      const requestKey = `default-${Date.now()}`;
      this.currentRequests.set(requestKey, controller);
      // Also store in the global variable for easier access
      currentController = controller;
      
      // Send request
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      // Clear the timeout and remove from active requests
      clearTimeout(timeoutId);
      this.currentRequests.delete(requestKey);
      if (currentController === controller) {
        currentController = null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        logError('API response not OK:', { status: response.status, error: errorText });
        return {
          success: false,
          error: `API error: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();

      // Extract the response data
      let responseData =
        data?.output?.answer ||
        data?.output?.response ||
        data?.response ||
        (typeof data === 'object' ? JSON.stringify(data) : data);

      if (!responseData) {
        return {
          success: false,
          error: 'Empty response from server'
        };
      }

      return {
        success: true,
        data: responseData
      };
    } catch (error) {
      logError('N8N default webhook error:', error);

      if (error instanceof Error) {
        // Handle abort/timeout errors
        if (error.name === 'AbortError') {
          // Check if this was a user-initiated abort
          if (userInitiatedAbort) {
            // This was intentionally cancelled by the user, do not treat as an error
            return {
              success: true,
              data: 'Request cancelled by user'
            };
          } else {
            // This was a timeout abort
            return {
              success: false,
              error: 'Connection timed out'
            };
          }
        }
        // Handle network errors
        else if (error.message.includes('network') || error.message.includes('Network Error')) {
          return {
            success: false,
            error:
              "We couldn't connect to the server. Please check your internet connection or try again in a few moments."
          };
        }

        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: false,
        error: 'Unknown error occurred'
      };
    }
  }

  /**
   * Stop current request if any is in progress
   * @returns true if a request was stopped, false otherwise
   */
  stopCurrentRequest(): boolean {
    // Set the flag to indicate this is a user-initiated abort
    userInitiatedAbort = true;
    
    // Try to abort using the global controller
    if (currentController) {
      currentController.abort('user_cancelled');
      currentController = null;
      logDebug('Aborted current request using global controller');
      return true;
    }
    
    // If that fails, try to abort all requests in the map
    if (this.currentRequests.size > 0) {
      let aborted = false;
      this.currentRequests.forEach((controller, key) => {
        controller.abort('user_cancelled');
        this.currentRequests.delete(key);
        aborted = true;
      });
      
      if (aborted) {
        logDebug(`Aborted ${this.currentRequests.size} pending requests`);
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if the abort was initiated by the user
   * @returns true if the abort was user-initiated
   */
  isUserInitiatedAbort(): boolean {
    return userInitiatedAbort;
  }
  
  /**
   * Reset the user-initiated abort flag
   */
  resetUserInitiatedAbort(): void {
    userInitiatedAbort = false;
  }

  /**
   * Cleanup function to handle any necessary resource cleanup.
   * Call this when the component using n8nService is unmounted.
   */
  cleanup() {
    logDebug('Cleaning up n8n service connection');
    this.stopCurrentRequest();
    this.currentRequests.clear();
  }
}

// Create a singleton instance with lazy initialization
let n8nServiceInstance: N8nService | null = null;

export const n8nService = (() => {
  if (!n8nServiceInstance) {
    n8nServiceInstance = new N8nService();
  }
  return n8nServiceInstance;
})();

// Export a factory function to create custom instances
export const createN8nService = (config: N8nConfig) => new N8nService(config);

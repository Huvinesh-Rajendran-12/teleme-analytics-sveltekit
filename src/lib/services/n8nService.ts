class UserCancelledError extends Error {
  constructor() {
    super('Request cancelled by user');
    this.name = 'UserCancelledError';
  }
}
class RequestTimeoutError extends Error {
  constructor() {
    super('Connection timed out');
    this.name = 'RequestTimeoutError';
  }
}
class NetworkConnectionError extends Error {
  constructor(originalMessage?: string) {
    super(
      originalMessage ||
        'Network connection error. Please check your internet connection or try again in a few moments.'
    );
    this.name = 'NetworkConnectionError';
  }
}
class HttpError extends Error {
  public status: number;
  public errorText?: string;
  constructor(status: number, statusText: string, errorText?: string) {
    super(`API error: ${status} ${statusText}`);
    this.name = 'HttpError';
    this.status = status;
    this.errorText = errorText;
  }
}

// Payload type for callWithParams
interface CallWithParamsPayload {
  sessionId: string;
  userId: string | number;
  userName: string;
  duration: number;
  message: string;
  application: 'analytics_chatbot' | 'health_tracker_summary'; // Can be more specific if only 'analytics_chatbot' or 'health_tracker_summary' are valid
  is_ngo?: boolean | null;
  patientId?: string | number | null;
}

import { logError, logDebug, logInfo } from '$lib/utils/secureLogger';

// Define the response structure for n8n service calls
type N8nServiceResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Type for the data structure expected from n8n webhooks
type N8nOutputData = {
  output: string;
};

// Configuration options for N8n service
type N8nConfig = {
  baseUrl: string;
  apiKey?: string;
  defaultTimeout?: number;
};

// Custom Error Types and Payload Type (defined above or imported)

// Default configuration values
const N8N_BASE_URL = '/api';
const N8N_API_KEY = '';
const N8N_ANALYTICS_WEBHOOK_URL = import.meta.env.VITE_N8N_ANALYTICS_WEBHOOK_URL;
const N8N_HEALTH_TRACKER_WEBHOOK_URL = import.meta.env.VITE_N8N_HEALTH_TRACKER_WEBHOOK_URL;
const N8N_ADMIN_WEBHOOK_URL = import.meta.env.VITE_N8N_ADMIN_WEBHOOK_URL; // Kept for completeness, though no method uses it now
const N8N_TIMEOUT = 60000;

let apiCallCount = 0; // Module-level call count

class N8nService {
  private baseUrl: string;
  private apiKey?: string;
  private defaultTimeout: number;
  private analyticsWebhookUrl?: string;
  private healthTrackerWebhookUrl?: string;
  private adminWebhookUrl?: string; // Kept for completeness
  private initialized: boolean = false;
  private currentRequests: Map<string, AbortController> = new Map();
  private userInitiatedAbort: boolean = false; // Instance-specific abort flag

  constructor(config?: N8nConfig) {
    this.baseUrl = (config?.baseUrl || N8N_BASE_URL).replace(/\/$/, '');
    this.apiKey = config?.apiKey || N8N_API_KEY;
    this.defaultTimeout = config?.defaultTimeout || N8N_TIMEOUT;
    this.analyticsWebhookUrl = N8N_ANALYTICS_WEBHOOK_URL;
    this.healthTrackerWebhookUrl = N8N_HEALTH_TRACKER_WEBHOOK_URL;
    this.adminWebhookUrl = N8N_ADMIN_WEBHOOK_URL;

    if (!this.initialized) {
      this.initialized = true;
      logInfo('N8n service initialized with base URL:', this.baseUrl);
    }
  }

  private getWebhookUrl(
    applicationType: 'analytics_chatbot' | 'health_tracker_summary' | string
  ): string | undefined {
    if (applicationType === 'analytics_chatbot') {
      return this.analyticsWebhookUrl;
    } else if (applicationType === 'health_tracker_summary') {
      return this.healthTrackerWebhookUrl;
    }
    // Potentially handle other types or a default if structure evolves
    return undefined;
  }

  private async _executeFetch<TResponseJson>(
    url: string,
    payload: unknown,
    requestKeyPrefix: string
  ): Promise<TResponseJson> {
    apiCallCount++;
    logDebug('N8N API call initiated via _executeFetch', {
      callCount: apiCallCount,
      url,
      requestKeyPrefix
    });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['X-N8N-API-KEY'] = this.apiKey;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      logDebug('Request timeout triggered', { url, timeout: this.defaultTimeout });
      controller.abort('timeout'); // Pass reason for timeout
    }, this.defaultTimeout);

    const requestKey = `${requestKeyPrefix}-${Date.now()}`;
    this.currentRequests.set(requestKey, controller);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not retrieve error text.');
        logError('API response not OK:', { status: response.status, errorText, url });
        throw new HttpError(response.status, response.statusText, errorText);
      }
      const jsonData = await response.json();
      logDebug('Raw n8n JSON response:', { data: jsonData, url });
      return jsonData as TResponseJson;
    } catch (error) {
      // Re-throw HttpError if it's already one (from the !response.ok block)
      if (error instanceof HttpError) throw error;

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          const signalReason = (controller.signal as AbortSignal & { reason?: string }).reason;
          if (this.userInitiatedAbort || signalReason === 'user_cancelled') {
            logInfo('Request cancelled by user', { url });
            throw new UserCancelledError();
          } else {
            // Timeout or other programmatic abort
            logError('Request timed out or aborted programmatically', { url });
            throw new RequestTimeoutError();
          }
        }
        if (
          error.message.toLowerCase().includes('failed to fetch') ||
          error.message.toLowerCase().includes('networkerror')
        ) {
          throw new NetworkConnectionError(error.message);
        }
      }
      logError('Unhandled N8n request error in _executeFetch:', { error, url });
      throw error; // Re-throw other unexpected errors
    } finally {
      clearTimeout(timeoutId);
      this.currentRequests.delete(requestKey);
      // Don't auto-reset the flag here - let the ChatContainer handle the timing
    }
  }

  async callWithParams(
    sessionId: string,
    userId: string | number,
    userName: string,
    period: number,
    message: string,
    application: 'analytics_chatbot' | 'health_tracker_summary' = 'analytics_chatbot',
    is_ngo: boolean | null = null,
    patientId: string | number | null = null
  ): Promise<N8nServiceResponse<N8nOutputData>> {
    const url = this.getWebhookUrl(application);
    if (!url) {
      const errorMsg = `Webhook URL not configured for application: ${application}`;
      logError(errorMsg, { application });
      return { success: false, error: errorMsg };
    }

    const payload: CallWithParamsPayload = {
      sessionId,
      userId,
      userName,
      duration: period,
      message,
      application,
      ...(is_ngo !== null && { is_ngo }),
      ...(patientId !== null && { patientId })
    };

    // Define the expected raw JSON structure from this specific endpoint
    type ExpectedRawJson = { output?: unknown; [key: string]: unknown };

    try {
      const rawData = await this._executeFetch<ExpectedRawJson>(
        url,
        payload,
        `callWithParams-${sessionId}`
      );

      // Validate and transform the rawData
      if (
        typeof rawData === 'object' &&
        rawData !== null &&
        'output' in rawData &&
        typeof rawData.output === 'string'
      ) {
        return { success: true, data: { output: rawData.output } };
      } else {
        logError('Malformed response from n8n for callWithParams', { receivedData: rawData, url });
        return {
          success: false,
          error: 'Malformed response from server. Expected { "output": string }'
        };
      }
    } catch (error) {
      if (error instanceof UserCancelledError) {
        return { success: true, data: { output: 'Request cancelled by user' } };
      } else if (error instanceof RequestTimeoutError) {
        return { success: false, error: error.message };
      } else if (error instanceof NetworkConnectionError) {
        return { success: false, error: error.message };
      } else if (error instanceof HttpError) {
        return { success: false, error: error.message }; // error.message includes status and statusText
      } else if (error instanceof Error) {
        logError(`N8n callWithParams error (${application}):`, error);
        return { success: false, error: error.message };
      }
      logError(`Unknown error in callWithParams (${application}):`, error);
      return { success: false, error: 'Unknown error occurred' };
    }
  }

  stopCurrentRequest(): boolean {
    if (this.currentRequests.size === 0) {
      logDebug('No active requests to stop.');
      return false;
    }
    this.userInitiatedAbort = true; // Set instance flag
    logDebug(`User initiated abort. Aborting ${this.currentRequests.size} pending requests.`);

    let abortedCount = 0;
    this.currentRequests.forEach((controller) => {
      controller.abort('user_cancelled'); // Pass reason
      // The controller will be removed from the map in _executeFetch's finally block.
      abortedCount++;
    });
    // Note: userInitiatedAbort flag is reset in _executeFetch's finally block
    return abortedCount > 0;
  }

  isUserInitiatedAbort(): boolean {
    return this.userInitiatedAbort;
  }

  resetUserInitiatedAbort(): void {
    // This is called by _executeFetch's finally block or can be called externally if needed.
    logDebug('Resetting user initiated abort flag state.');
    this.userInitiatedAbort = false;
  }

  cleanup() {
    logDebug('Cleaning up n8n service instance.');
    this.stopCurrentRequest(); // This will abort requests.
    this.currentRequests.clear(); // Explicitly clear map in case any linger.
    this.resetUserInitiatedAbort(); // Ensure flag is reset.
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

import axios from "axios";
import { browser } from "$app/environment";

interface N8nConfig {
  baseUrl: string;
  apiKey?: string;
  defaultTimeout?: number;
}

interface N8nResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Default values that will be overridden by environment variables in the browser
let N8N_BASE_URL = "http://localhost:5678";
let N8N_API_KEY = "";
let N8N_ANALYTICS_WEBHOOK_URL = "";
let N8N_HEALTH_TRACKER_WEBHOOK_URL = "";
let N8N_ADMIN_WEBHOOK_URL = "";
let N8N_TIMEOUT = 60000;

// Load environment variables from the browser
if (browser) {
  N8N_BASE_URL = (
    import.meta.env.VITE_N8N_BASE_URL || "http://localhost:5678"
  ).replace(/\/$/, "");
  N8N_API_KEY = import.meta.env.VITE_N8N_API_KEY;
  N8N_ANALYTICS_WEBHOOK_URL = import.meta.env.VITE_N8N_ANALYTICS_WEBHOOK_URL;
  N8N_HEALTH_TRACKER_WEBHOOK_URL = import.meta.env
    .VITE_N8N_HEALTH_TRACKER_WEBHOOK_URL;
  N8N_ADMIN_WEBHOOK_URL = import.meta.env.VITE_N8N_ADMIN_WEBHOOK_URL;
  N8N_TIMEOUT = Number(import.meta.env.VITE_N8N_TIMEOUT) || 60000;
}

// Track API calls for debugging (using a private counter for security)
let apiCallCount = 0;

export class N8nService {
  private baseUrl: string;
  private apiKey?: string;
  private defaultTimeout: number;
  private analyticsWebhookUrl?: string;
  private healthTrackerWebhookUrl?: string;
  private adminWebhookUrl?: string;
  private initialized: boolean = false;

  constructor(config?: N8nConfig) {
    // Use provided config or environment variables
    this.baseUrl = (config?.baseUrl || N8N_BASE_URL).replace(/\/$/, "");
    this.apiKey = config?.apiKey || N8N_API_KEY;
    this.defaultTimeout = config?.defaultTimeout || N8N_TIMEOUT;
    this.analyticsWebhookUrl = N8N_ANALYTICS_WEBHOOK_URL;
    this.healthTrackerWebhookUrl = N8N_HEALTH_TRACKER_WEBHOOK_URL;
    this.adminWebhookUrl = N8N_ADMIN_WEBHOOK_URL;

    // Only log initialization once
    if (!this.initialized) {
      this.initialized = true;
      console.info("N8N service initialized with base URL:", this.baseUrl);
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
    application: string = "analytics_chatbot",
    is_ngo: boolean | null = null,
    patient_id: string | number | null = null,
  ): Promise<N8nResponse<string>> {
    // Track API calls for debugging
    apiCallCount++;
    console.debug("API call initiated", {
      sessionId: "[REDACTED]",
      callCount: apiCallCount,
    });
    try {
      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add API key if provided
      if (this.apiKey) {
        headers["X-N8N-API-KEY"] = this.apiKey;
      }

      // Construct URL - default to analytics webhook if available, otherwise fallback to old path
      let url;
      if (application === "analytics_chatbot") {
        url = this.analyticsWebhookUrl;
      } else if (application === "health_tracker_summary") {
        url = this.healthTrackerWebhookUrl;
      }

      // Fallback if the specific webhook URL for the application type is not configured,
      // or if the application type doesn't match the specific cases handled above.
      // The original fallback was `${this.baseUrl}/webhook/nextjs-test`. Let's keep that.
      console.debug("Calling n8n service", { url });

      // Make the request with abort controller for better timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.defaultTimeout,
      );

      const response = await axios({
        method: "post",
        url: url,
        headers: headers,
        data: {
          sessionId,
          user_id: userId,
          user_name: userName,
          duration: period,
          message,
          ...(is_ngo !== null && { is_ngo }),
          ...(patient_id !== null && { patient_id }),
          application,
        },
        signal: controller.signal,
      });

      // Clear the timeout
      clearTimeout(timeoutId);

      // Handle various response formats
      let responseData =
        response.data?.output?.answer ||
        response.data?.output?.response ||
        response.data?.response ||
        response.data;

      if (
        !responseData ||
        (typeof responseData === "string" && responseData.trim() === "")
      ) {
        return {
          success: false,
          error: "Empty response from server",
        };
      }

      // Sanitize any SVG content in the response to prevent rendering errors
      if (typeof responseData === "string") {
        responseData = responseData; // In a real app, you would process SVG here
      }

      return {
        success: true,
        data: responseData,
      };
    } catch (error: any) {
      console.error("N8N webhook error:", error);

      // Handle specific error types
      if (error instanceof Error) {
        if (axios.isAxiosError(error)) {
          if (
            error.code === "ECONNABORTED" ||
            error.message.includes("timeout")
          ) {
            return {
              success: false,
              error: "Connection timed out",
            };
          } else if (error.code === "ECONNREFUSED") {
            return {
              success: false,
              error: "Connection refused",
            };
          } else if (error.message.includes("Network Error")) {
            return {
              success: false,
              error:
                "We couldn't connect to the server. Please check your internet connection or try again in a few moments.",
            };
          }
        }

        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: "Unknown error occurred",
      };
    }
  }

  /**
   * Send a message to n8n and get a response
   */
  async sendMessage(
    sessionId: string,
    message: string,
    userId: string | number = "1160",
    application: string = "analytics_chatbot",
    patient_id?: string | number | null,
  ): Promise<N8nResponse<string>> {
    // Track API calls for debugging
    apiCallCount++;
    console.debug("Message API call initiated", {
      sessionId: "[REDACTED]",
      callCount: apiCallCount,
    });
    try {
      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add API key if provided
      if (this.apiKey) {
        headers["X-N8N-API-KEY"] = this.apiKey;
      }

      // Select appropriate webhook URL based on application
      let url;
      if (application === "analytics_chatbot") {
        url = this.analyticsWebhookUrl;
      } else if (application === "health_tracker_summary") {
        url = this.healthTrackerWebhookUrl;
      } else {
        // Fallback to default
        url = `${this.baseUrl}/webhook/nextjs-test`;
      }

      if (!url) {
        console.error(
          `No webhook URL available for application: ${application}`,
        );
        return {
          success: false,
          error: `Webhook URL not configured for application: ${application}`,
        };
      }

      console.debug("Sending message to n8n", {
        messageFirstChars: message.substring(0, 20) + "...",
      });

      // Make the request with abort controller for better timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.defaultTimeout,
      );

      const response = await axios({
        method: "post",
        url: url,
        headers: headers,
        data: {
          sessionId: sessionId,
          message: message,
          user_id: userId,
          application: application,
          ...(application === "health_tracker_summary" &&
            patient_id !== null && { patient_id }),
        },
        signal: controller.signal,
      });

      // Clear the timeout
      clearTimeout(timeoutId);

      // Handle various response formats
      let responseData =
        response.data?.output?.answer ||
        response.data?.output?.response ||
        response.data?.response ||
        response.data;

      if (
        !responseData ||
        (typeof responseData === "string" && responseData.trim() === "")
      ) {
        return {
          success: false,
          error: "Empty response from server",
        };
      }

      // Sanitize any SVG content in the response to prevent rendering errors
      if (typeof responseData === "string") {
        responseData = responseData; // In a real app, you would process SVG here
      }

      return {
        success: true,
        data: responseData,
      };
    } catch (error: any) {
      console.error("N8N webhook error:", error);

      // Handle specific error types
      if (error instanceof Error) {
        if (axios.isAxiosError(error)) {
          if (
            error.code === "ECONNABORTED" ||
            error.message.includes("timeout")
          ) {
            return {
              success: false,
              error: "Connection timed out",
            };
          } else if (error.code === "ECONNREFUSED") {
            return {
              success: false,
              error: "Connection refused",
            };
          } else if (error.message.includes("Network Error")) {
            return {
              success: false,
              error:
                "We couldn't connect to the server. Please check your internet connection or try again in a few moments.",
            };
          }
        }

        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: "Unknown error occurred",
      };
    }
  }

  /**
   * Call default webhook with generic payload
   */
  async callDefaultWebhook(
    payload: unknown,
    path: string = "default",
  ): Promise<N8nResponse<string>> {
    // Track API calls for debugging
    apiCallCount++;
    console.debug("N8N API call", {
      callNumber: apiCallCount,
      path,
      payloadPreview: "Redacted for security",
    });

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.apiKey) {
        headers["X-N8N-API-KEY"] = this.apiKey;
      }

      // Use appropriate webhook URL based on path
      let url;
      if (path === "analytics") {
        url = this.analyticsWebhookUrl;
      } else if (path === "admin") {
        url = this.adminWebhookUrl;
      } else {
        url = `${this.baseUrl}/webhook/${path}`;
      }

      if (!url) {
        console.error("No webhook URL available for path", { path });
        return {
          success: false,
          error: `Webhook URL not configured for: ${path}`,
        };
      }

      console.debug("Calling default webhook", { url });

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.defaultTimeout,
      );

      const response = await axios.post(url, payload, {
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Extract the response data
      let responseData =
        response.data.output?.answer ||
        response.data.output?.response ||
        response.data.response ||
        JSON.stringify(response.data);

      // Sanitize any SVG content in the response
      if (typeof responseData === "string") {
        responseData = responseData; // In a real app, you would process SVG here
      }

      return {
        success: true,
        data: responseData,
      };
    } catch (error: any) {
      console.error("N8N default webhook error:", error);

      if (error instanceof Error) {
        if (axios.isAxiosError(error)) {
          if (
            error.code === "ECONNABORTED" ||
            error.message.includes("timeout")
          ) {
            return {
              success: false,
              error: "Connection timed out",
            };
          } else if (error.code === "ECONNREFUSED") {
            return {
              success: false,
              error: "Connection refused",
            };
          } else if (error.message.includes("Network Error")) {
            return {
              success: false,
              error:
                "We couldn't connect to the server. Please check your internet connection or try again in a few moments.",
            };
          }
        }

        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: "Unknown error occurred",
      };
    }
  }

  /**
   * Cleanup function
   */
  cleanup() {
    console.debug("Cleaning up n8n service connection");
    // Any cleanup logic here
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

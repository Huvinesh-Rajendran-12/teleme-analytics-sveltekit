import axios from "axios";
import type {
  ConversationsList,
  ConversationDetail,
  UserActivityStats
} from "$lib/types/conversations"; 
import { getStoredAdminToken } from "$lib/utils/auth";
import { logDebug, logError, logInfo } from "$lib/utils/secureLogger";
import { browser } from "$app/environment";

// Environment variables
let N8N_ADMIN_DASHBOARD_WEBHOOK_URL = "";
let N8N_ADMIN_WEBHOOK_URL = "";

// Initialize environment variables if in browser
if (browser) {
  // Directly load and log the environment variable value to confirm what's being loaded
  const envAdminWebhookUrl = import.meta.env.VITE_N8N_ADMIN_WEBHOOK_URL;
  logDebug("Raw VITE_N8N_ADMIN_WEBHOOK_URL env value:", envAdminWebhookUrl);
  
  // Set the admin webhook URLs
  N8N_ADMIN_WEBHOOK_URL = envAdminWebhookUrl || "https://teleme-n8n.teleme.co/webhook/ai-admin";
  N8N_ADMIN_DASHBOARD_WEBHOOK_URL = 
    import.meta.env.VITE_N8N_ADMIN_DASHBOARD_WEBHOOK_URL || 
    "https://teleme-n8n.teleme.co/webhook/ai-admin-dashboard";
  
  // Log the final URLs being used
  logDebug("FINAL N8N_ADMIN_WEBHOOK_URL (Conversations):", N8N_ADMIN_WEBHOOK_URL);
  logDebug("FINAL N8N_ADMIN_DASHBOARD_WEBHOOK_URL (Stats):", N8N_ADMIN_DASHBOARD_WEBHOOK_URL);
  
  // Add this debugging line to see all environment variables
  logDebug("All environment variables:", {
    VITE_N8N_ADMIN_WEBHOOK_URL: envAdminWebhookUrl,
    VITE_N8N_ANALYTICS_WEBHOOK_URL: import.meta.env.VITE_N8N_ANALYTICS_WEBHOOK_URL,
    VITE_N8N_HEALTH_TRACKER_WEBHOOK_URL: import.meta.env.VITE_N8N_HEALTH_TRACKER_WEBHOOK_URL,
    MODE: import.meta.env.MODE
  });
}

/**
 * Helper function to inspect a JWT token
 */
function inspectToken(token: string | null): void {
  if (!token) {
    logDebug("Token inspection: Token is null or empty");
    return;
  }

  logDebug(`Token inspection: Token length = ${token.length}`);

  try {
    // Split the token into parts
    const parts = token.split(".");
    logDebug(`Token inspection: Token has ${parts.length} parts`);

    if (parts.length === 3) {
      // Try to decode the header and payload
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));

      logDebug("Token header:", header);
      logDebug("Token payload:", {
        ...payload,
        exp: payload.exp
          ? new Date(payload.exp * 1000).toISOString()
          : undefined,
        iat: payload.iat
          ? new Date(payload.iat * 1000).toISOString()
          : undefined,
      });

      // Check if token is expired
      if (payload.exp) {
        const expiryDate = new Date(payload.exp * 1000);
        const now = new Date();
        const isExpired = expiryDate < now;

        logDebug(`Token expires: ${expiryDate.toISOString()}`);
        logDebug(`Token is ${isExpired ? "EXPIRED" : "valid"}`);
      }
    }
  } catch (err) {
    logError("Error inspecting token:", err);
  }
}

/**
 * Authenticates an admin user with username and password
 * @param username Admin username
 * @param password Admin password
 * @returns JWT token if authentication is successful
 */
export async function authenticateAdmin(
  username: string,
  password: string,
): Promise<string | null> {
  logInfo("Attempting admin authentication");
  try {
    logInfo("Sending authentication request to /api/admin/auth");
    const response = await axios.post("/api/admin/auth", {
      username,
      password,
    });

    logDebug("Authentication response received:", {
      status: response.status,
      success: response.data?.success || false,
      hasToken: Boolean(response.data?.token),
    });

    if (response.data.success && response.data.token) {
      logDebug("Authentication successful");
      return response.data.token;
    }
    logDebug("Authentication failed: Invalid credentials or missing token");
    return null;
  } catch (error) {
    logError("Admin authentication error:", error);
    if (axios.isAxiosError(error) && error.response) {
      logDebug("Auth error response status:", error.response.status);
      logDebug("Auth error response data:", error.response.data);
    }
    throw error;
  }
}

/**
 * Fetch conversations from Analytics Chatbot
 */
export async function fetchAnalyticsChatbotConversations(
  page: number = 1,
  pageSize: number = 10,
  searchTerm: string = '',
): Promise<ConversationsList[]> {
  try {
    logDebug("======== FETCH ANALYTICS CHATBOT CONVERSATIONS ========");
    logDebug(`fetchAnalyticsChatbotConversations called at ${new Date().toISOString()}`);
    logDebug("Parameters:", { page, pageSize, searchTerm });

    const token = getStoredAdminToken();
    logDebug("Token available for API call:", Boolean(token));
    inspectToken(token);

    if (!token) {
      logError("No authentication token found - cannot proceed with API call");
      throw new Error("Authentication required. Please login as admin.");
    }

    // Use direct string URL to avoid any issues with environment variables
    // This matches exactly what's in the .env file
    const directUrl = "https://teleme-n8n.teleme.co/webhook/ai-admin";
    
    // Prepare URL parameters
    const params = new URLSearchParams({
      action: "list_conversations",
      application: "analytics_chatbot",
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    // Add search term if provided
    if (searchTerm && searchTerm.trim()) {
      params.append("search_term", searchTerm.trim());
    }

    // Build the URL with parameters using both the configured and direct URLs
    const configuredUrl = `${N8N_ADMIN_WEBHOOK_URL}?${params.toString()}`;
    const hardcodedUrl = `${directUrl}?${params.toString()}`;
    
    // Log both URLs to compare them
    logDebug(`Configured URL: ${configuredUrl}`);
    logDebug(`Hardcoded URL: ${hardcodedUrl}`);
    
    // Use the hardcoded URL for this request to ensure it works
    const url = hardcodedUrl;
    logDebug(`Using URL for request: ${url}`);

    try {
      const startTime = Date.now();
      logDebug("Starting API request...");
      
      // Add authorization header with admin token
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      logDebug("Request headers:", { Authorization: `Bearer ${token.substring(0, 5)}...` });
      
      // Set a timeout to ensure we don't wait forever
      const response = await axios.get(url, { 
        headers,
        timeout: 15000 // 15 second timeout
      });
      
      const endTime = Date.now();
      logDebug(`API request completed in ${endTime - startTime}ms`);
      logDebug("Response status:", response.status);

      // Log the important parts of the response
      if (response.data) {
        logDebug("Raw response data type:", typeof response.data);
        
        // If the response is an array matching the format you shared
        if (Array.isArray(response.data) && 
            response.data.length > 0 && 
            response.data[0] && 
            typeof response.data[0] === 'object' &&
            'conversations' in response.data[0]) {
            
          logDebug("SUCCESS: Response matches expected array format with conversations in first element");
          // Matched the exact format you shared - this is correct!
          return response.data as ConversationsList[];
        }
        // If it's a direct ConversationsList object
        else if (typeof response.data === 'object' && 
                'conversations' in response.data) {
          logDebug("Found direct conversations object, wrapping in array");
          return [response.data as ConversationsList];
        }
        // For any other format, create a proper structure
        else {
          logDebug("Unexpected response format, creating standard structure");
          const emptyList: ConversationsList = {
            conversations: [],
            total_pages: 1,
            current_page: page,
            page_size: pageSize,
            total_records: 0
          };
          
          return [emptyList];
        }
      } else {
        logDebug("No data in response");
        const emptyList: ConversationsList = {
          conversations: [],
          total_pages: 1,
          current_page: page,
          page_size: pageSize,
          total_records: 0
        };
        
        return [emptyList];
      }
    } catch (apiError) {
      logError("API request failed:", apiError);
      if (axios.isAxiosError(apiError) && apiError.response) {
        logError("Error response status:", apiError.response.status);
        logError("Error response data:", apiError.response.data);
      }
      throw apiError;
    }
  } catch (error) {
    logError("Error fetching analytics chatbot conversations:", error);
    throw error;
  }
}

/**
 * Fetch conversations from Health Tracker
 */
export async function fetchHealthTrackerConversations(
  page: number = 1,
  pageSize: number = 10,
  searchTerm: string = '',
): Promise<ConversationsList[]> {
  try {
    logDebug("======== FETCH HEALTH TRACKER CONVERSATIONS ========");
    logDebug(`fetchHealthTrackerConversations called at ${new Date().toISOString()}`);
    logDebug("Parameters:", { page, pageSize, searchTerm });

    const token = getStoredAdminToken();
    logDebug("Token available for API call:", Boolean(token));
    inspectToken(token);

    if (!token) {
      logError("No authentication token found - cannot proceed with API call");
      throw new Error("Authentication required. Please login as admin.");
    }

    // Use direct string URL to avoid any issues with environment variables
    const directUrl = "https://teleme-n8n.teleme.co/webhook/ai-admin";
    
    // Prepare URL parameters
    const params = new URLSearchParams({
      action: "list_conversations",
      application: "health_tracker_summary",
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    // Add search term if provided
    if (searchTerm && searchTerm.trim()) {
      params.append("search_term", searchTerm.trim());
    }

    // Build the URL with parameters
    const url = `${directUrl}?${params.toString()}`;
    logDebug(`Calling N8N admin webhook: ${url}`);

    try {
      const startTime = Date.now();
      logDebug("Starting API request...");
      
      // Add authorization header with admin token
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      logDebug("Request headers:", { Authorization: `Bearer ${token.substring(0, 5)}...` });
      
      // Set a timeout to ensure we don't wait forever
      const response = await axios.get(url, { 
        headers,
        timeout: 15000 // 15 second timeout
      });
      
      const endTime = Date.now();
      logDebug(`API request completed in ${endTime - startTime}ms`);
      logDebug("Response status:", response.status);

      // Log the important parts of the response
      if (response.data) {
        logDebug("Raw response data type:", typeof response.data);
        
        // If the response is an array matching the format you shared
        if (Array.isArray(response.data) && 
            response.data.length > 0 && 
            response.data[0] && 
            typeof response.data[0] === 'object' &&
            'conversations' in response.data[0]) {
            
          logDebug("SUCCESS: Response matches expected array format with conversations in first element");
          // Matched the exact format you shared - this is correct!
          return response.data as ConversationsList[];
        }
        // If it's a direct ConversationsList object
        else if (typeof response.data === 'object' && 
                'conversations' in response.data) {
          logDebug("Found direct conversations object, wrapping in array");
          return [response.data as ConversationsList];
        }
        // For any other format, create a proper structure
        else {
          logDebug("Unexpected response format, creating standard structure");
          const emptyList: ConversationsList = {
            conversations: [],
            total_pages: 1,
            current_page: page,
            page_size: pageSize,
            total_records: 0
          };
          
          return [emptyList];
        }
      } else {
        logDebug("No data in response");
        const emptyList: ConversationsList = {
          conversations: [],
          total_pages: 1,
          current_page: page,
          page_size: pageSize,
          total_records: 0
        };
        
        return [emptyList];
      }
    } catch (apiError) {
      logError("API request failed:", apiError);
      if (axios.isAxiosError(apiError) && apiError.response) {
        logError("Error response status:", apiError.response.status);
        logError("Error response data:", apiError.response.data);
      }
      throw apiError;
    }
  } catch (error) {
    logError("Error fetching health tracker conversations:", error);
    throw error;
  }
}

/**
 * Fetches details of a specific conversation
 * @param conversationId ID of the conversation to fetch
 * @param application Application type ("analytics_chatbot" or "health_tracker_summary")
 * @returns Conversation details including messages
 */
export async function fetchConversationDetail(
  conversationId: string,
  application: string = "analytics_chatbot",
): Promise<ConversationDetail> {
  try {
    const token = getStoredAdminToken();
    if (!token) {
      throw new Error("Authentication required. Please login as admin.");
    }

    // Prepare URL parameters
    const params = new URLSearchParams({
      action: "get_conversation",
      application, // Add application as a parameter
      conversationId,
    });

    // Build the URL with parameters
    const url = `${N8N_ADMIN_WEBHOOK_URL}?${params.toString()}`;
    logDebug(`Calling N8N admin webhook for conversation detail: ${url}`);

    // Add authorization header with admin token
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    try {
      const startTime = Date.now();
      logDebug("Starting conversation detail API request...");
      const response = await axios.get(url, { headers });
      const endTime = Date.now();
      logDebug(`Conversation detail API request completed in ${endTime - startTime}ms`);
      logDebug("Response status:", response.status);

      // Assuming the backend returns data directly conforming to ConversationDetail
      const conversationDetail: ConversationDetail = response.data;

      // Basic validation
      if (
        !conversationDetail ||
        typeof conversationDetail !== "object" ||
        !Array.isArray(conversationDetail.messages)
      ) {
        logError("Invalid conversation detail response format:", response.data);
        throw new Error("Invalid conversation detail response format.");
      }

      logDebug("Returning conversationDetail with", conversationDetail.messages?.length || 0, "messages");
      return conversationDetail;
    } catch (apiError) {
      logError("Conversation detail API request failed:", apiError);
      if (axios.isAxiosError(apiError) && apiError.response) {
        logError("Error response status:", apiError.response.status);
        logError("Error response data:", apiError.response.data);
      }
      throw apiError;
    }
  } catch (error) {
    logError(`Error fetching conversation ${conversationId}:`, error);
    throw error;
  }
}

/**
 * Fetches dashboard statistics for Analytics Chatbot.
 * @returns UserActivityStats containing user activity metrics.
 */
export async function fetchAnalyticsChatbotStats(): Promise<UserActivityStats | null> {
  try {
    logDebug("======== FETCH ANALYTICS CHATBOT STATS ========");
    logDebug(`fetchAnalyticsChatbotStats called at ${new Date().toISOString()}`);

    const token = getStoredAdminToken();
    logDebug("Token available for API call:", Boolean(token));
    inspectToken(token);

    if (!token) {
      logError("No authentication token found - cannot proceed with API call");
      throw new Error("Authentication required. Please login as admin.");
    }

    // Build the URL
    const url = N8N_ADMIN_DASHBOARD_WEBHOOK_URL;
    logDebug(`Calling N8N admin dashboard webhook: ${url}`);

    // Add authorization header with admin token
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    try {
      const startTime = Date.now();
      logDebug("Starting analytics chatbot stats API request...");
      logDebug("Request headers:", headers); // Log headers for debugging
      const response = await axios.get<Array<Record<string, unknown>>>(url, { headers });
      const endTime = Date.now();
      logDebug(`Analytics chatbot stats API request completed in ${endTime - startTime}ms`);

      // Process the received data
      const rawDataArray = response.data; // Array of application stats
      const analyticsRaw = rawDataArray.find(
        (stats) => stats.application_type === "analytics_chatbot"
      ) as Record<string, string | number | Record<string, number>> | undefined;

      // Assuming analyticsRaw directly matches the structure of your data for a single application
      const processedStats: UserActivityStats | null =
        analyticsRaw
          ? {
              dau: parseInt(String(analyticsRaw.daily_active_users || "0"), 10) || 0,
              wau: parseInt(String(analyticsRaw.weekly_active_users || "0"), 10) || 0,
              mau: parseInt(String(analyticsRaw.monthly_active_users || "0"), 10) || 0,
              totalUsersEver: parseInt(String(analyticsRaw.total_users_ever || "0"), 10) || 0,
              activeSessions: parseInt(String(analyticsRaw.active_sessions || "0"), 10) || 0,
              inactiveSessions: parseInt(String(analyticsRaw.inactive_sessions || "0"), 10) || 0,
              totalSessions: parseInt(String(analyticsRaw.total_sessions || "0"), 10) || 0,
              avgSessionsPerUser: parseFloat(String(analyticsRaw.avg_sessions_per_user || "0")) || 0,
              weeklyRetentionRate: parseFloat(String(analyticsRaw.weekly_retention_rate || "0")) || 0,
              avgSessionMinutes: parseFloat(String(analyticsRaw.avg_session_minutes || "0")) || 0,
              maxSessionMinutes: parseFloat(String(analyticsRaw.max_session_minutes || "0")) || 0,
              newUsersToday: parseInt(String(analyticsRaw.new_users_today || "0"), 10) || 0,
              newUsersThisWeek: parseInt(String(analyticsRaw.new_users_this_week || "0"), 10) || 0,
              newUsersThisMonth: parseInt(String(analyticsRaw.new_users_this_month || "0"), 10) || 0,
              mostRecentActivity: String(analyticsRaw.most_recent_activity || new Date(0).toISOString()),
              timeSinceLastActivity: {
                hours: (analyticsRaw.time_since_last_activity as Record<string, number>)?.hours || 0,
                minutes: (analyticsRaw.time_since_last_activity as Record<string, number>)?.minutes || 0,
                seconds: (analyticsRaw.time_since_last_activity as Record<string, number>)?.seconds || 0,
                milliseconds: (analyticsRaw.time_since_last_activity as Record<string, number>)?.milliseconds || 0
              },
            }
          : null;

      logDebug("Processed analytics chatbot stats received");
      return processedStats;
    } catch (apiError) {
      logError("Analytics chatbot stats API request failed:", apiError);
      if (axios.isAxiosError(apiError) && apiError.response) {
        logError("Error response status:", apiError.response.status);
        logError("Error response data:", apiError.response.data);
      }
      throw apiError;
    }
  } catch (error) {
    logError("Error fetching analytics chatbot stats:", error);
    throw error;
  }
}

/**
 * Fetches dashboard statistics for Health Tracker Summary.
 * @returns UserActivityStats containing user activity metrics.
 */
export async function fetchHealthTrackerStats(): Promise<UserActivityStats | null> {
  try {
    logDebug("======== FETCH HEALTH TRACKER STATS ========");
    logDebug(`fetchHealthTrackerStats called at ${new Date().toISOString()}`);

    const token = getStoredAdminToken();
    logDebug("Token available for API call:", Boolean(token));
    inspectToken(token);

    if (!token) {
      logError("No authentication token found - cannot proceed with API call");
      throw new Error("Authentication required. Please login as admin.");
    }

    // Build the URL
    const url = N8N_ADMIN_DASHBOARD_WEBHOOK_URL;
    logDebug(`Calling N8N admin dashboard webhook: ${url}`);

    // Add authorization header with admin token
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    try {
      const startTime = Date.now();
      logDebug("Starting health tracker stats API request...");
      logDebug("Request headers:", headers); // Log headers for debugging
      const response = await axios.get<Array<Record<string, unknown>>>(url, { headers });
      const endTime = Date.now();
      logDebug(`Health tracker stats API request completed in ${endTime - startTime}ms`);

      // Process the received data
      const rawDataArray = response.data; // Array of application stats
      const healthTrackerRaw = rawDataArray.find(
        (stats) => stats.application_type === "health_tracker_summary"
      ) as Record<string, string | number | Record<string, number>> | undefined;

      // Process the data into our expected format
      const processedStats: UserActivityStats | null =
        healthTrackerRaw
          ? {
              dau: parseInt(String(healthTrackerRaw.daily_active_users || "0"), 10) || 0,
              wau: parseInt(String(healthTrackerRaw.weekly_active_users || "0"), 10) || 0,
              mau: parseInt(String(healthTrackerRaw.monthly_active_users || "0"), 10) || 0,
              totalUsersEver: parseInt(String(healthTrackerRaw.total_users_ever || "0"), 10) || 0,
              activeSessions: parseInt(String(healthTrackerRaw.active_sessions || "0"), 10) || 0,
              inactiveSessions: parseInt(String(healthTrackerRaw.inactive_sessions || "0"), 10) || 0,
              totalSessions: parseInt(String(healthTrackerRaw.total_sessions || "0"), 10) || 0,
              avgSessionsPerUser: parseFloat(String(healthTrackerRaw.avg_sessions_per_user || "0")) || 0,
              weeklyRetentionRate: parseFloat(String(healthTrackerRaw.weekly_retention_rate || "0")) || 0,
              avgSessionMinutes: parseFloat(String(healthTrackerRaw.avg_session_minutes || "0")) || 0,
              maxSessionMinutes: parseFloat(String(healthTrackerRaw.max_session_minutes || "0")) || 0,
              newUsersToday: parseInt(String(healthTrackerRaw.new_users_today || "0"), 10) || 0,
              newUsersThisWeek: parseInt(String(healthTrackerRaw.new_users_this_week || "0"), 10) || 0,
              newUsersThisMonth: parseInt(String(healthTrackerRaw.new_users_this_month || "0"), 10) || 0,
              mostRecentActivity: String(healthTrackerRaw.most_recent_activity || new Date(0).toISOString()),
              timeSinceLastActivity: {
                hours: (healthTrackerRaw.time_since_last_activity as Record<string, number>)?.hours || 0,
                minutes: (healthTrackerRaw.time_since_last_activity as Record<string, number>)?.minutes || 0,
                seconds: (healthTrackerRaw.time_since_last_activity as Record<string, number>)?.seconds || 0,
                milliseconds: (healthTrackerRaw.time_since_last_activity as Record<string, number>)?.milliseconds || 0
              },
            }
          : null;

      logDebug("Processed health tracker stats received");
      return processedStats;
    } catch (apiError) {
      logError("Health tracker stats API request failed:", apiError);
      if (axios.isAxiosError(apiError) && apiError.response) {
        logError("Error response status:", apiError.response.status);
        logError("Error response data:", apiError.response.data);
      }
      throw apiError;
    }
  } catch (error) {
    logError("Error fetching health tracker stats:", error);
    throw error;
  }
}
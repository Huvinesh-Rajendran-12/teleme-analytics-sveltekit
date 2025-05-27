/**
 * Configuration for the admin panel
 */

/**
 * Session timeout configuration
 */
export const SESSION_CONFIG = {
  // Session timeout in milliseconds (30 minutes)
  TIMEOUT_DURATION: 30 * 60 * 1000,
  // Warning time before logout (5 minutes before timeout)
  WARNING_DURATION: 5 * 60 * 1000,
  // Check interval for session activity (1 minute)
  CHECK_INTERVAL: 60 * 1000,
  // Local storage key for last activity timestamp
  LAST_ACTIVITY_KEY: 'admin_last_activity',
  // Session warning dialog timeout key
  WARNING_SHOWN_KEY: 'admin_warning_shown'
};

/**
 * Available application types
 */
export const APPLICATION_TYPES = {
  ANALYTICS_CHATBOT: 'analytics_chatbot',
  HEALTH_TRACKER_SUMMARY: 'health_tracker_summary'
};

/**
 * Human-readable names for applications
 */
export const APPLICATION_DISPLAY_NAMES = {
  [APPLICATION_TYPES.ANALYTICS_CHATBOT]: 'Analytics Chatbot',
  [APPLICATION_TYPES.HEALTH_TRACKER_SUMMARY]: 'Health Tracker Summary'
};

/**
 * Get the display name for an application
 * @param appType Application type
 * @returns Human-readable application name
 */
export function getApplicationDisplayName(appType: string): string {
  return APPLICATION_DISPLAY_NAMES[appType] || appType;
}

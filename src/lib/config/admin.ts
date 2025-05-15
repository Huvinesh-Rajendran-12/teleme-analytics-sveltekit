/**
 * Configuration for the admin panel
 */

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

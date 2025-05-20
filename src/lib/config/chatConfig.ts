/**
 * Central configuration for chat components
 * Contains timeouts, connection settings, and endpoints
 */

// Connection check settings
export const CONNECTION_CHECK_TIMEOUT = 5000; // 5 seconds timeout for connection checks
export const CONNECTION_CHECK_INTERVAL = Number(import.meta.env.VITE_CONNECTION_CHECK_INTERVAL) || 30000; // 30 seconds between checks
export const CONNECTION_RETRY_MAX = Number(import.meta.env.VITE_CONNECTION_RETRY_MAX) || 5; // Max automatic retries
export const CONNECTION_RETRY_DELAY = Number(import.meta.env.VITE_CONNECTION_RETRY_DELAY) || 3000; // Delay between retries

// Timeout settings (in minutes)
export const TIMEOUTS = {
  analytics: Number(import.meta.env.VITE_ANALYTICS_CHATBOT_TIMEOUT) || 5,
  healthTracker: Number(import.meta.env.VITE_HEALTH_TRACKER_TIMEOUT) || 10
};

// API Endpoints
export const ENDPOINTS = {
  analytics: import.meta.env.VITE_N8N_ANALYTICS_WEBHOOK_URL || '',
  healthTracker: import.meta.env.VITE_N8N_HEALTH_TRACKER_WEBHOOK_URL || ''
};

// Message validation
export const MAX_QUESTION_LENGTH = 1000;

// UI elements
export const UI_TEXT = {
  // Connection status messages
  connection: {
    lost: {
      analytics: 'Connection to Analytics service lost. Please click Retry to reconnect.',
      healthTracker: 'Connection to Health Tracker service lost. Please click Retry to reconnect.',
      generic: 'Connection lost. Some features may be unavailable until connection is restored.'
    },
    restored: {
      analytics: 'Connection restored! You can continue using the Analytics Assistant.',
      healthTracker: 'Connection restored! You can continue using the Health Tracker.',
      generic: 'Connection restored! All features are now available.'
    },
    error: {
      analytics: 'Cannot connect to the service. Please check your network connection and try again later.',
      healthTracker: 'Cannot connect to the Health Tracker service. Please check your network connection and try again later.',
      generic: 'Network connection issue detected. Some features may be unavailable.'
    },
    retrying: {
      message: 'Attempting to reconnect. Retry {{count}} of {{max}}...'
    }
  },
  offline: {
    message: 'You are currently offline. Some features are unavailable.',
    queuedMessage: 'Your message will be sent when connection is restored.',
    limitedFeatures: 'Limited functionality available while offline.'
  }
};

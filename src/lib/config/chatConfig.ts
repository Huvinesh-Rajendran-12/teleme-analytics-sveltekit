/**
 * Central configuration for chat components
 * Contains timeouts, connection settings, and endpoints
 */

// Connection check settings
export const CONNECTION_CHECK_TIMEOUT = 5000; // 5 seconds timeout for connection checks

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
      healthTracker: 'Connection to Health Tracker service lost. Please click Retry to reconnect.'
    },
    restored: {
      analytics: 'Connection restored! You can continue using the Analytics Assistant.',
      healthTracker: 'Connection restored! You can continue using the Health Tracker.'
    },
    error: {
      analytics: 'Cannot connect to the service. Please check your network connection and try again later.',
      healthTracker: 'Cannot connect to the Health Tracker service. Please check your network connection and try again later.'
    }
  }
};

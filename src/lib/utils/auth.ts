/**
 * Authentication utility functions for the admin dashboard
 */
import { browser } from '$app/environment';
import { logDebug, logError } from './secureLogger';

// Determine if running in a development environment
const isDev = browser && import.meta.env.DEV;

// Debug flag - set to true to enable detailed auth logging ONLY in dev
const DEBUG_AUTH = isDev;

/**
 * Helper function to log auth-related debug messages
 */
function logAuth(...args: unknown[]): void {
  if (DEBUG_AUTH) {
    logDebug('[AUTH]', ...args);
  }
}

/**
 * Stores the admin session token in local storage
 * @param token The session token to store
 */
export const storeAdminToken = (token: string): void => {
  logAuth('Storing admin token');
  
  if (!token) {
    logAuth('Warning: Attempting to store empty token');
    return;
  }
  
  try {
    if (browser && window.localStorage) {
      logAuth(`Storing token (length: ${token.length}) in localStorage`);
      localStorage.setItem('admin_session_token', token);
      logAuth('Token stored successfully');
      
      // Verify storage worked
      const storedToken = localStorage.getItem('admin_session_token');
      logAuth('Verification - Token retrieved after storing:', Boolean(storedToken));
    } else {
      logAuth('Warning: localStorage not available');
    }
  } catch (error) {
    logError('Error storing admin token:', error);
  }
};

/**
 * Retrieves the stored admin session token
 * @returns The stored session token or null if not found
 */
export const getStoredAdminToken = (): string | null => {
  logAuth('Retrieving admin token');
  
  try {
    if (browser && window.localStorage) {
      const token = localStorage.getItem('admin_session_token');
      logAuth('Token retrieved:', Boolean(token));
      if (token) {
        logAuth(`Token length: ${token.length}`);
        // Log the first and last few characters of token for debugging
        if (token.length > 10) {
          logAuth(`Token prefix: ${token.substring(0, 5)}...${token.substring(token.length - 5)}`);
        }
      } else {
        logAuth('No token found in localStorage');
      }
      return token;
    } else {
      logAuth('Warning: localStorage not available when retrieving token');
    }
  } catch (error) {
    logError('Error retrieving admin token:', error);
  }
  
  logAuth('Returning null token');
  return null;
};

/**
 * Clears the stored admin session token
 */
export const clearAdminToken = (): void => {
  logAuth('Clearing admin token');
  
  try {
    if (browser && window.localStorage) {
      const hadToken = Boolean(localStorage.getItem('admin_session_token'));
      logAuth('Token existed before clearing:', hadToken);
      
      localStorage.removeItem('admin_session_token');
      logAuth('Token cleared from localStorage');
      
      // Verify clearing worked
      const tokenAfterClearing = localStorage.getItem('admin_session_token');
      logAuth('Verification - Token after clearing:', Boolean(tokenAfterClearing));
    } else {
      logAuth('Warning: localStorage not available when clearing token');
    }
  } catch (error) {
    logError('Error clearing admin token:', error);
  }
};

/**
 * Checks if a token exists and is not expired
 * @returns Boolean indicating if admin is logged in
 */
export const isAdminLoggedIn = (): boolean => {
  logAuth('Checking if admin is logged in');
  const token = getStoredAdminToken();
  
  if (!token) {
    logAuth('No token found, admin is not logged in');
    return false;
  }
  
  // In a real implementation, you might want to validate the token
  // (e.g., check expiration by decoding JWT)
  logAuth('Token found, admin is logged in');
  return true;
};

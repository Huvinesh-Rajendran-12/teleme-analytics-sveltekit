// Basic secure logger utility for client-side logging.
// In a real application, this would likely integrate with a
// centralized logging service and handle sensitive data appropriately.

// Determine if debug logging is enabled (e.g., based on environment variable)
// Using a simple flag for now.
const IS_DEBUG_ENABLED = true; // Replace with proper env var check in production

export const logInfo = (message: string, ...args: unknown[]) => {
  console.info(`[INFO] ${message}`, ...args);
};

export const logError = (message: string, ...args: unknown[]) => {
  console.error(`[ERROR] ${message}`, ...args);
};

export const logDebug = (message: string, ...args: unknown[]) => {
  if (IS_DEBUG_ENABLED) {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
};
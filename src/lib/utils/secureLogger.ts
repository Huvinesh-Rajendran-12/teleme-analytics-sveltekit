/**
 * Secure Logger Utility
 * 
 * A utility for logging information to the console while redacting sensitive data.
 * Provides different log levels and can be disabled in production environments.
 */

import { browser } from '$app/environment';

// Define log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4, // No logging
}

// Configuration for the logger
interface LoggerConfig {
  // Current log level - only logs at this level or higher will be shown
  level: LogLevel;
  // Patterns to redact from logs (regex or string)
  sensitivePatterns: Array<RegExp | string>;
  // Whether to show timestamps with logs
  showTimestamp: boolean;
}

// Default configuration based on environment
const isDev = browser && import.meta.env.DEV;

// Get environment appropriate log level
const getDefaultLogLevel = (): LogLevel => {
  if (browser) {
    const envValue = import.meta.env.VITE_LOG_LEVEL;
    if (envValue) {
      if (envValue === 'DEBUG') return LogLevel.DEBUG;
      if (envValue === 'INFO') return LogLevel.INFO;
      if (envValue === 'WARN') return LogLevel.WARN;
      if (envValue === 'ERROR') return LogLevel.ERROR;
      if (envValue === 'NONE') return LogLevel.NONE;
    }
  }
  // Default based on environment if not specified
  return isDev ? LogLevel.DEBUG : LogLevel.WARN;
};

// Default configuration
const defaultConfig: LoggerConfig = {
  level: getDefaultLogLevel(),
  sensitivePatterns: [
    // Auth tokens
    /auth_token['":\s=]+[^&"\s,)]+/gi,
    /bearer\s+[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/gi,
    
    // Session IDs - UUID v4 and v7 formats
    /sessionId['":\s=]+([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi,
    /sessionId['":\s=]+([0-9]{4}[a-f0-9]{16})/gi,
    
    // Patient and User IDs
    /patientId['":\s=]+\d+/gi,
    /userId['":\s=]+\d+/gi,
    /user_id['":\s=]+\d+/gi,
    /patient_id['":\s=]+\d+/gi,
    
    // Centre IDs
    /centre_id['":\s=]+\d+/gi,
    /centreId['":\s=]+\d+/gi,
  ],
  showTimestamp: true,
};

/**
 * Replaces sensitive information with redacted text
 * 
 * @param message The message to redact
 * @param patterns Array of patterns (regex or string) to redact
 * @returns Redacted message
 */
function redactSensitiveInfo(message: unknown, patterns: Array<RegExp | string>): unknown {
  if (typeof message !== 'string') {
    // For objects and arrays, stringify, redact, then parse back
    try {
      const stringified = JSON.stringify(message);
      const redacted = redactSensitiveInfo(stringified, patterns);
      return JSON.parse(redacted as string);
    } catch {
      // If we can't stringify/parse, return a generic "[Complex Object]" message
      return '[Complex Object - Redacted for security]';
    }
  }

  // For strings, apply each redaction pattern
  if (typeof message === 'string') {
    let redactedMessage = message;
    patterns.forEach((pattern) => {
      if (pattern instanceof RegExp) {
        redactedMessage = redactedMessage.replace(pattern, (match) => {
          // Get the key part (e.g., "auth_token") and redact only the value
          const keyMatch = match.match(/^([a-zA-Z_]+['":\s=]+)/);
          if (keyMatch) {
            return `${keyMatch[1]}[REDACTED]`;
          }
          return '[REDACTED]';
        });
      } else if (typeof pattern === 'string') {
        redactedMessage = redactedMessage.replace(pattern, '[REDACTED]');
      }
    });
    return redactedMessage;
  }
  // Should not be reached if logic is correct, but as a fallback:
  return '[UNEXPECTED_NON_STRING_REDACTION_INPUT]';
}

// Create the logger class
export class SecureLogger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Updates the logger configuration
   * 
   * @param config Configuration options to update
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Adds a new sensitive pattern to redact
   * 
   * @param pattern Regex or string pattern to redact
   */
  addSensitivePattern(pattern: RegExp | string): void {
    this.config.sensitivePatterns.push(pattern);
  }

  /**
   * Sets the current log level
   * 
   * @param level The log level to set
   */
  setLogLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Internal logging method
   * 
   * @param level Log level of this message
   * @param message Message or object to log
   * @param args Additional arguments
   */
  private log(level: LogLevel, message: unknown, ...args: unknown[]): void {
    // Skip if this log level is not enabled
    if (level < this.config.level) return;

    // Prepare timestamp if needed
    const timestamp = this.config.showTimestamp 
      ? `[${new Date().toISOString()}]` 
      : '';
    
    // Prepare level indicator
    const levelStr = LogLevel[level];
    
    // Redact sensitive info from message and args
    const redactedMessage = redactSensitiveInfo(message, this.config.sensitivePatterns);
    const redactedArgs = args.map(arg => redactSensitiveInfo(arg, this.config.sensitivePatterns));
    
    // Log to appropriate console method
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`${timestamp} [${levelStr}]`, redactedMessage, ...redactedArgs);
        break;
      case LogLevel.INFO:
        console.info(`${timestamp} [${levelStr}]`, redactedMessage, ...redactedArgs);
        break;
      case LogLevel.WARN:
        console.warn(`${timestamp} [${levelStr}]`, redactedMessage, ...redactedArgs);
        break;
      case LogLevel.ERROR:
        console.error(`${timestamp} [${levelStr}]`, redactedMessage, ...redactedArgs);
        break;
    }
  }

  /**
   * Log a debug message
   */
  debug(message: unknown, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  /**
   * Log an info message
   */
  info(message: unknown, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  /**
   * Log a warning message
   */
  warn(message: unknown, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  /**
   * Log an error message
   */
  error(message: unknown, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }
}

// Create and export a default logger instance
export const logger = new SecureLogger();

/**
 * Helper function to safely log objects that might contain sensitive data
 */
export function safeLog(level: LogLevel, message: unknown, ...args: unknown[]): void {
  switch (level) {
    case LogLevel.DEBUG:
      logger.debug(message, ...args);
      break;
    case LogLevel.INFO:
      logger.info(message, ...args);
      break;
    case LogLevel.WARN:
      logger.warn(message, ...args);
      break;
    case LogLevel.ERROR:
      logger.error(message, ...args);
      break;
  }
}

// Convenience functions to match the existing API
export const logDebug = (message: unknown, ...args: unknown[]) => safeLog(LogLevel.DEBUG, message, ...args);
export const logInfo = (message: unknown, ...args: unknown[]) => safeLog(LogLevel.INFO, message, ...args);
export const logWarn = (message: unknown, ...args: unknown[]) => safeLog(LogLevel.WARN, message, ...args);
export const logError = (message: unknown, ...args: unknown[]) => safeLog(LogLevel.ERROR, message, ...args);

// Function to completely disable all logs (for production)
export function disableAllLogs(): void {
  logger.setLogLevel(LogLevel.NONE);
}

// Function to enable logs based on environment
export function configureLoggerForEnvironment(): void {
  logger.setLogLevel(getDefaultLogLevel());
}

// Configure logger based on environment
configureLoggerForEnvironment();
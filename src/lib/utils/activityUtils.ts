import { checkConnectionStatus } from './connectionUtils';
import { connectionStore } from '$lib/stores/connectionStore';

// Types for the activity tracker
export interface ActivityTrackerOptions {
  timeoutMinutes: number;
  connectionCheckEndpoint: string;
  connectionCheckTimeout?: number;
  connectionCheckInterval?: number; // New option for connection check interval
  serviceType?: string; // Identify which service this tracker is for
  onInactivityTimeout: () => void;
  onConnectionChange?: (isConnected: boolean) => void;
  logDebug?: (message: string, data?: Record<string, unknown>) => void;
  logError?: (message: string, data?: Record<string, unknown>) => void;
}

export class ActivityTracker {
  private lastActivityTime: number;
  private inactivityTimerId: number | null = null;
  private connectionCheckIntervalId: number | null = null;
  private isConnected: boolean = true;
  private options: ActivityTrackerOptions;

  constructor(options: ActivityTrackerOptions) {
    this.lastActivityTime = Date.now();
    this.options = {
      connectionCheckTimeout: 5000, // Default timeout is 5 seconds
      connectionCheckInterval: 30000, // Default to check every 30 seconds
      serviceType: 'generic', // Default service type
      ...options
    };

    // Default logging functions if not provided
    if (!this.options.logDebug) {
      this.options.logDebug = (message: string, data?: Record<string, unknown>) => {
        console.debug(message, data);
      };
    }

    if (!this.options.logError) {
      this.options.logError = (message: string, data?: Record<string, unknown>) => {
        console.error(message, data);
      };
    }

    // Initial connection check
    this.checkConnection().then((connected) => {
      this.isConnected = connected;
      if (this.options.onConnectionChange) {
        this.options.onConnectionChange(connected);
      }
      
      // Update the global connection store
      connectionStore.setStatus(connected, this.options.serviceType);
    });
    
    // Start periodic connection checks
    this.startPeriodicConnectionChecks();
  }

  // Record user activity
  public recordActivity(): void {
    this.lastActivityTime = Date.now();
    this.options.logDebug?.('Activity recorded');

    // If not connected, try checking connection on activity
    if (!this.isConnected) {
      this.checkConnection().then((connected) => {
        // Only notify if connection status changed
        if (connected !== this.isConnected) {
          this.isConnected = connected;
          if (this.options.onConnectionChange) {
            this.options.onConnectionChange(connected);
          }
          
          // Update the global connection store
          connectionStore.setStatus(connected, this.options.serviceType);
        }
      });
    }
  }

  // Start the inactivity timer
  public startInactivityTimer(): void {
    if (this.inactivityTimerId !== null) {
      window.clearInterval(this.inactivityTimerId);
    }

    // Check for inactivity every 30 seconds
    this.inactivityTimerId = window.setInterval(() => {
      const inactiveTime = Date.now() - this.lastActivityTime;
      const inactivityLimit = this.options.timeoutMinutes * 60 * 1000;

      if (inactiveTime >= inactivityLimit) {
        this.options.logDebug?.('Inactivity timeout reached');
        this.options.onInactivityTimeout();
      }
    }, 30000); // Check every 30 seconds

    this.options.logDebug?.('Inactivity timer started');
  }

  // Check the connection status
  public async checkConnection(): Promise<boolean> {
    try {
      const connected = await checkConnectionStatus(
        this.options.connectionCheckEndpoint,
        this.options.connectionCheckTimeout
      );
      
      this.options.logDebug?.(`Connection check result: ${connected}`);
      return connected;
    } catch (error) {
      this.options.logError?.('Error checking connection', error as Record<string, unknown>);
      return false;
    }
  }

  // Manually retry the connection
  public async retryConnection(): Promise<boolean> {
    // Update retry count in store
    connectionStore.incrementRetryCount();
    connectionStore.setRetrying(true);
    
    try {
      const connected = await this.checkConnection();
      
      // Update state and notify only if status changed
      if (connected !== this.isConnected) {
        this.isConnected = connected;
        if (this.options.onConnectionChange) {
          this.options.onConnectionChange(connected);
        }
        
        // Update the global connection store
        connectionStore.setStatus(connected, this.options.serviceType);
      }
      
      return connected;
    } finally {
      // Always reset retrying state
      connectionStore.setRetrying(false);
    }
  }

  // Get the current connection status
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Start periodic connection checks
   */
  public startPeriodicConnectionChecks(intervalMs?: number): void {
    // Clear existing interval if any
    if (this.connectionCheckIntervalId !== null) {
      window.clearInterval(this.connectionCheckIntervalId);
      this.connectionCheckIntervalId = null;
    }
    
    // Use provided interval or default from options
    const checkInterval = intervalMs || this.options.connectionCheckInterval;
    
    this.connectionCheckIntervalId = window.setInterval(async () => {
      // Set retrying state in the store
      connectionStore.setRetrying(true);
      
      try {
        const connected = await this.checkConnection();
        
        // Update connection status if changed
        if (connected !== this.isConnected) {
          this.isConnected = connected;
          
          // Notify listeners
          if (this.options.onConnectionChange) {
            this.options.onConnectionChange(connected);
          }
          
          // Update the global connection store
          connectionStore.setStatus(connected, this.options.serviceType);
          
          this.options.logDebug?.(`Connection status changed to: ${connected}`);
        }
      } catch (error) {
        this.options.logError?.('Error during periodic connection check', error as Record<string, unknown>);
      } finally {
        // Reset retrying state
        connectionStore.setRetrying(false);
      }
    }, checkInterval);
    
    this.options.logDebug?.(`Periodic connection checks started (interval: ${checkInterval}ms)`);
  }
  
  /**
   * Stop periodic connection checks
   */
  public stopPeriodicConnectionChecks(): void {
    if (this.connectionCheckIntervalId !== null) {
      window.clearInterval(this.connectionCheckIntervalId);
      this.connectionCheckIntervalId = null;
      this.options.logDebug?.('Periodic connection checks stopped');
    }
  }

  // Clean up resources
  public cleanup(): void {
    if (this.inactivityTimerId !== null) {
      window.clearInterval(this.inactivityTimerId);
      this.inactivityTimerId = null;
    }
    
    // Stop connection checks
    this.stopPeriodicConnectionChecks();
    
    // Remove any attached event listeners to prevent memory leaks
    this.removeActivityListeners();
    
    this.options.logDebug?.('Activity tracker cleaned up');
  }

  // Attach global event listeners for activity tracking
  public attachActivityListeners(element?: HTMLElement): void {
    const trackActivity = () => this.recordActivity();
    
    // Document-level events
    document.addEventListener('mousedown', trackActivity);
    document.addEventListener('keypress', trackActivity);
    document.addEventListener('touchstart', trackActivity);
    
    // Element-specific events if provided
    if (element) {
      element.addEventListener('scroll', trackActivity);
    }
    
    this.options.logDebug?.('Activity listeners attached');
  }
  
  // Remove global event listeners
  public removeActivityListeners(element?: HTMLElement): void {
    const trackActivity = () => this.recordActivity();
    
    document.removeEventListener('mousedown', trackActivity);
    document.removeEventListener('keypress', trackActivity);
    document.removeEventListener('touchstart', trackActivity);
    
    if (element) {
      element.removeEventListener('scroll', trackActivity);
    }
    
    this.options.logDebug?.('Activity listeners removed');
  }
}

// Helper functions to check message types
export function isConnectionErrorMessage(content: string): boolean {
  const connectionErrorPatterns = [
    'Cannot connect to the',
    'Still unable to connect',
    'network connection',
    'service lost',
    'Connection to', // Only match "Connection to" for error messages, not restoration messages
    'Connection lost'
  ];
  
  return connectionErrorPatterns.some(pattern => 
    typeof content === 'string' && content.includes(pattern)
  );
}

export function isConnectionRestoredMessage(content: string): boolean {
  const connectionRestoredPatterns = [
    'Connection restored',
    'Connection to the .* has been restored',
    'Connection has been restored'
  ];
  
  return connectionRestoredPatterns.some(pattern => 
    typeof content === 'string' && new RegExp(pattern, 'i').test(content)
  );
}

// Check if we should add a connection-related message (avoid duplicates)
export function shouldAddConnectionErrorMessage(
  newContent: string,
  lastMessageContent?: string | object
): boolean {
  // Check if this is a restoration message
  const isRestorationMessage = isConnectionRestoredMessage(newContent);
  
  // Check if this is an error message
  const isErrorMessage = isConnectionErrorMessage(newContent);
  
  // If the message we're trying to add is not about connections at all, always add it
  if (!isErrorMessage && !isRestorationMessage) {
    return true;
  }
  
  // If the last message exists and is a string
  if (lastMessageContent && typeof lastMessageContent === 'string') {
    // For error messages, don't add if the last message was also an error
    if (isErrorMessage) {
      return !isConnectionErrorMessage(lastMessageContent);
    }
    
    // For restoration messages, don't add if the last message was also about restoration
    if (isRestorationMessage) {
      return !isConnectionRestoredMessage(lastMessageContent);
    }
  }
  
  // Default: if there's no last message or it's not a string, add the message
  return true;
}
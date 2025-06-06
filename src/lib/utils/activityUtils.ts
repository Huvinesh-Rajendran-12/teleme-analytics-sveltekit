import { checkConnectionStatus } from './connectionUtils';
import { connectionStore } from '$lib/stores/connectionStore';
import { ActivityObserver } from './activityObserver';
import { activityStore } from '$lib/stores/activityStore';
import { v7 as uuidv7 } from 'uuid';

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
  pauseOnInvisible?: boolean; // Whether to pause timer when tab/window loses focus
}

export class ActivityTracker {
  private lastActivityTime: number;
  private inactivityTimerId: number | null = null;
  private connectionCheckIntervalId: number | null = null;
  private isConnected: boolean = true;
  private options: ActivityTrackerOptions;
  private isPaused: boolean = false;
  private observer: ActivityObserver;
  private elementListeners: Map<HTMLElement, () => void> = new Map();
  private trackerId: string;

  constructor(options: ActivityTrackerOptions) {
    this.trackerId = uuidv7().substring(0, 8);  // Short ID for tracking
    this.lastActivityTime = Date.now();
    this.options = {
      connectionCheckTimeout: 5000, // Default timeout is 5 seconds
      connectionCheckInterval: 30000, // Default to check every 30 seconds
      serviceType: 'generic', // Default service type
      pauseOnInvisible: false, // By default, DO NOT pause timers when tab loses focus
      ...options
    };

    // Get the observer singleton instance
    this.observer = ActivityObserver.getInstance();
    
    // Register with the activity store
    activityStore.registerTracker(this.trackerId, options.serviceType || 'generic');
    
    // Log status periodically (every 2 minutes) to help debug timer issues
    if (typeof window !== 'undefined') {
      window.setInterval(() => {
        const inactiveTime = Date.now() - this.lastActivityTime;
        const inactivityLimit = this.options.timeoutMinutes * 60 * 1000;
        this.options.logDebug?.('Activity status check', {
          trackerId: this.trackerId,
          serviceType: this.options.serviceType,
          inactiveTime: Math.floor(inactiveTime / 1000) + 's',
          timeoutMinutes: this.options.timeoutMinutes,
          timeLeft: Math.floor((inactivityLimit - inactiveTime) / 1000) + 's',
          isPaused: this.isPaused,
          isConnected: this.isConnected,
          pauseOnInvisible: this.options.pauseOnInvisible,
          hasTimerActive: this.inactivityTimerId !== null
        });
      }, 120000); // Log every 2 minutes
    }

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
    
    // Register with the activity observer
    this.observer.registerTracker(this);
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
      this.inactivityTimerId = null;
    }

    const CHECK_INTERVAL = 15000; // Check every 15 seconds (more frequent)
    const inactivityLimit = this.options.timeoutMinutes * 60 * 1000;
    
    this.options.logDebug?.('Inactivity timer started', {
      timeoutMinutes: this.options.timeoutMinutes,
      inactivityLimitMs: inactivityLimit,
      checkIntervalMs: CHECK_INTERVAL,
      pauseOnInvisible: this.options.pauseOnInvisible
    });

    // Check for inactivity regularly
    this.inactivityTimerId = window.setInterval(() => {
      // Skip the check if timer is paused
      if (this.isPaused) {
        this.options.logDebug?.('Inactivity check skipped - timer paused');
        return;
      }
      
      const inactiveTime = Date.now() - this.lastActivityTime;
      
      // Log the current inactive time (helpful for debugging)
      if (inactiveTime > 60000) { // Only log if over 1 minute
        this.options.logDebug?.('Inactivity check', {
          inactiveTime,
          inactivityLimit,
          timeLeft: inactivityLimit - inactiveTime,
          isPaused: this.isPaused,
          timeoutMinutes: this.options.timeoutMinutes
        });
      }

      if (inactiveTime >= inactivityLimit) {
        this.options.logDebug?.('Inactivity timeout reached', {
          inactiveTime,
          inactivityLimit,
          timeoutMinutes: this.options.timeoutMinutes
        });
        
        // Execute the timeout callback
        this.options.onInactivityTimeout();
        
        // Clear the timer after timeout is triggered
        if (this.inactivityTimerId !== null) {
          window.clearInterval(this.inactivityTimerId);
          this.inactivityTimerId = null;
        }
      }
    }, CHECK_INTERVAL); 
  }

  /**
   * Pause the inactivity timer (stops timeout from triggering)
   */
  public pauseInactivityTimer(): void {
    if (!this.isPaused) {
      this.isPaused = true;
      // Record current time to prevent timer expiry immediately after resuming
      this.lastActivityTime = Date.now();
      this.options.logDebug?.('Inactivity timer paused');
    }
  }

  /**
   * Resume the inactivity timer (allows timeout to trigger again)
   */
  public resumeInactivityTimer(): void {
    if (this.isPaused) {
      this.isPaused = false;
      // Reset the last activity time to prevent immediate timeout
      this.lastActivityTime = Date.now();
      this.options.logDebug?.('Inactivity timer resumed');
      
      // Ensure timer is still running
      if (!this.inactivityTimerId) {
        this.startInactivityTimer();
      }
    }
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
   * Check if this tracker should pause on visibility change
   */
  public shouldPauseOnInvisible(): boolean {
    return !!this.options.pauseOnInvisible;
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
        this.options.logError?.(
          'Error during periodic connection check',
          error as Record<string, unknown>
        );
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

    // Unregister from the activity observer
    this.observer.unregisterTracker(this);
    
    // Unregister from the activity store
    activityStore.unregisterTracker(this.trackerId);
    
    // Remove any attached element-specific listeners
    this.removeAllElementListeners();

    this.options.logDebug?.('Activity tracker cleaned up');
  }

  // Attach element-specific event listeners for activity tracking
  public attachElementListener(element: HTMLElement): void {
    if (!element) return;
    
    if (!this.elementListeners.has(element)) {
      const boundRecordActivity = this.recordActivity.bind(this);
      element.addEventListener('scroll', boundRecordActivity);
      this.elementListeners.set(element, boundRecordActivity);
      this.options.logDebug?.('Element listener attached');
    }
  }

  // Remove element-specific event listeners
  public removeElementListener(element: HTMLElement): void {
    if (!element) return;
    
    const listener = this.elementListeners.get(element);
    if (listener) {
      element.removeEventListener('scroll', listener);
      this.elementListeners.delete(element);
      this.options.logDebug?.('Element listener removed');
    }
  }
  
  // Remove all element listeners
  private removeAllElementListeners(): void {
    this.elementListeners.forEach((listener, element) => {
      element.removeEventListener('scroll', listener);
    });
    this.elementListeners.clear();
    this.options.logDebug?.('All element listeners removed');
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

  return connectionErrorPatterns.some(
    (pattern) => typeof content === 'string' && content.includes(pattern)
  );
}

export function isConnectionRestoredMessage(content: string): boolean {
  const connectionRestoredPatterns = [
    'Connection restored',
    'Connection to the .* has been restored',
    'Connection has been restored'
  ];

  return connectionRestoredPatterns.some(
    (pattern) => typeof content === 'string' && new RegExp(pattern, 'i').test(content)
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
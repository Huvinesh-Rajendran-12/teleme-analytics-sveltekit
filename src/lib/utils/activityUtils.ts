import { checkConnectionStatus } from './connectionUtils';

// Types for the activity tracker
export interface ActivityTrackerOptions {
  timeoutMinutes: number;
  connectionCheckEndpoint: string;
  connectionCheckTimeout?: number;
  onInactivityTimeout: () => void;
  onConnectionChange?: (isConnected: boolean) => void;
  logDebug?: (message: string, data?: any) => void;
  logError?: (message: string, data?: any) => void;
}

export class ActivityTracker {
  private lastActivityTime: number;
  private inactivityTimerId: number | null = null;
  private isConnected: boolean = true;
  private options: ActivityTrackerOptions;

  constructor(options: ActivityTrackerOptions) {
    this.lastActivityTime = Date.now();
    this.options = {
      connectionCheckTimeout: 5000, // Default timeout is 5 seconds
      ...options
    };

    // Default logging functions if not provided
    if (!this.options.logDebug) {
      this.options.logDebug = (message: string, data?: any) => {
        console.debug(message, data);
      };
    }

    if (!this.options.logError) {
      this.options.logError = (message: string, data?: any) => {
        console.error(message, data);
      };
    }

    // Initial connection check
    this.checkConnection().then((connected) => {
      this.isConnected = connected;
      if (this.options.onConnectionChange) {
        this.options.onConnectionChange(connected);
      }
    });
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
      this.options.logError?.('Error checking connection', error);
      return false;
    }
  }

  // Manually retry the connection
  public async retryConnection(): Promise<boolean> {
    const connected = await this.checkConnection();
    
    // Update state and notify only if status changed
    if (connected !== this.isConnected) {
      this.isConnected = connected;
      if (this.options.onConnectionChange) {
        this.options.onConnectionChange(connected);
      }
    }
    
    return connected;
  }

  // Get the current connection status
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Clean up resources
  public cleanup(): void {
    if (this.inactivityTimerId !== null) {
      window.clearInterval(this.inactivityTimerId);
      this.inactivityTimerId = null;
    }
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

// Helper functions to check if a message is a connection error
export function isConnectionErrorMessage(content: string): boolean {
  const connectionErrorPatterns = [
    'Cannot connect to the',
    'Connection to',
    'Still unable to connect',
    'network connection',
    'service lost'
  ];
  
  return connectionErrorPatterns.some(pattern => 
    typeof content === 'string' && content.includes(pattern)
  );
}

// Check if we should add a connection error message (avoid duplicates)
export function shouldAddConnectionErrorMessage(
  newContent: string,
  lastMessageContent?: string | object
): boolean {
  // If the message we're trying to add is not about connection errors, always add it
  if (!isConnectionErrorMessage(newContent)) {
    return true;
  }
  
  // If the last message was also about connection errors, don't add a duplicate
  if (lastMessageContent && typeof lastMessageContent === 'string') {
    return !isConnectionErrorMessage(lastMessageContent);
  }
  
  // If there's no last message or it's not a string, add the connection error
  return true;
}
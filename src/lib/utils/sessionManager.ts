/**
 * Session management utility for admin dashboard
 * Handles automatic logout, activity tracking, and session timeout warnings
 */
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { clearAdminToken, getStoredAdminToken } from './auth';
import { logDebug, logInfo, logWarn } from './secureLogger';
import { SESSION_CONFIG } from '$lib/config/admin';

export interface SessionWarningCallback {
  onWarning: (timeLeft: number) => void;
  onTimeout: () => void;
}

class SessionManager {
  private timeoutId: NodeJS.Timeout | null = null;
  private warningTimeoutId: NodeJS.Timeout | null = null;
  private checkIntervalId: NodeJS.Timeout | null = null;
  private warningCallback: SessionWarningCallback | null = null;
  private isWarningShown = false;

  /**
   * Initialize session management
   */
  init(callback?: SessionWarningCallback): void {
    if (!browser) return;

    logDebug('[SESSION] Initializing session manager');
    
    this.warningCallback = callback || null;
    this.updateLastActivity();
    this.startActivityTracking();
    this.startSessionCheck();
  }

  /**
   * Update the last activity timestamp
   */
  updateLastActivity(): void {
    if (!browser) return;

    const now = Date.now();
    localStorage.setItem(SESSION_CONFIG.LAST_ACTIVITY_KEY, now.toString());
    logDebug('[SESSION] Updated last activity:', new Date(now).toISOString());

    // Reset warning state when there's activity
    if (this.isWarningShown) {
      this.isWarningShown = false;
      localStorage.removeItem(SESSION_CONFIG.WARNING_SHOWN_KEY);
    }

    // Reset timeouts
    this.resetTimeouts();
  }

  /**
   * Get the last activity timestamp
   */
  getLastActivity(): number {
    if (!browser) return Date.now();

    const lastActivity = localStorage.getItem(SESSION_CONFIG.LAST_ACTIVITY_KEY);
    return lastActivity ? parseInt(lastActivity) : Date.now();
  }

  /**
   * Check if the session has timed out
   */
  isSessionExpired(): boolean {
    const lastActivity = this.getLastActivity();
    const now = Date.now();
    const timeSinceActivity = now - lastActivity;

    logDebug('[SESSION] Time since last activity:', Math.round(timeSinceActivity / 1000), 'seconds');
    
    return timeSinceActivity > SESSION_CONFIG.TIMEOUT_DURATION;
  }

  /**
   * Get time remaining before session expires
   */
  getTimeUntilExpiry(): number {
    const lastActivity = this.getLastActivity();
    const now = Date.now();
    const timeSinceActivity = now - lastActivity;
    const timeRemaining = SESSION_CONFIG.TIMEOUT_DURATION - timeSinceActivity;

    return Math.max(0, timeRemaining);
  }

  /**
   * Check if we should show the warning
   */
  shouldShowWarning(): boolean {
    const timeRemaining = this.getTimeUntilExpiry();
    return timeRemaining <= SESSION_CONFIG.WARNING_DURATION && timeRemaining > 0;
  }

  /**
   * Start tracking user activity
   */
  private startActivityTracking(): void {
    if (!browser) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const activityHandler = () => {
      this.updateLastActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, activityHandler, { passive: true });
    });

    logDebug('[SESSION] Started activity tracking for events:', events);
  }

  /**
   * Start periodic session checks
   */
  private startSessionCheck(): void {
    if (!browser) return;

    this.checkIntervalId = setInterval(() => {
      this.checkSession();
    }, SESSION_CONFIG.CHECK_INTERVAL);

    logDebug('[SESSION] Started session check interval');
  }

  /**
   * Check session status and handle timeouts/warnings
   */
  private checkSession(): void {
    // Check if user is still logged in
    const token = getStoredAdminToken();
    if (!token) {
      logInfo('[SESSION] No token found, stopping session management');
      this.cleanup();
      return;
    }

    if (this.isSessionExpired()) {
      logWarn('[SESSION] Session expired, logging out user');
      this.handleTimeout();
      return;
    }

    if (this.shouldShowWarning() && !this.isWarningShown) {
      logInfo('[SESSION] Showing session timeout warning');
      this.showWarning();
    }
  }

  /**
   * Reset session timeouts
   */
  private resetTimeouts(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId);
    }

    // Set new timeout for session expiry
    const timeUntilExpiry = this.getTimeUntilExpiry();
    this.timeoutId = setTimeout(() => {
      this.handleTimeout();
    }, timeUntilExpiry);

    // Set new timeout for warning
    const timeUntilWarning = Math.max(0, timeUntilExpiry - SESSION_CONFIG.WARNING_DURATION);
    if (timeUntilWarning > 0) {
      this.warningTimeoutId = setTimeout(() => {
        this.showWarning();
      }, timeUntilWarning);
    }

    logDebug('[SESSION] Reset timeouts - expire in:', Math.round(timeUntilExpiry / 1000), 'seconds');
  }

  /**
   * Show session timeout warning
   */
  private showWarning(): void {
    if (this.isWarningShown) return;

    this.isWarningShown = true;
    localStorage.setItem(SESSION_CONFIG.WARNING_SHOWN_KEY, 'true');

    const timeLeft = this.getTimeUntilExpiry();
    
    if (this.warningCallback) {
      this.warningCallback.onWarning(timeLeft);
    }

    logInfo('[SESSION] Warning shown, time left:', Math.round(timeLeft / 1000), 'seconds');
  }

  /**
   * Handle session timeout
   */
  private handleTimeout(): void {
    logWarn('[SESSION] Session timed out, logging out user');
    
    if (this.warningCallback) {
      this.warningCallback.onTimeout();
    }

    this.logout();
  }

  /**
   * Manually extend the session
   */
  extendSession(): void {
    logInfo('[SESSION] Session extended by user');
    this.updateLastActivity();
  }

  /**
   * Manually logout the user
   */
  logout(): void {
    logInfo('[SESSION] Logging out user');
    
    this.cleanup();
    clearAdminToken();
    
    // Clear session-related storage
    if (browser) {
      localStorage.removeItem(SESSION_CONFIG.LAST_ACTIVITY_KEY);
      localStorage.removeItem(SESSION_CONFIG.WARNING_SHOWN_KEY);
    }

    goto('/admin/login');
  }

  /**
   * Clean up timers and event listeners
   */
  cleanup(): void {
    logDebug('[SESSION] Cleaning up session manager');

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId);
      this.warningTimeoutId = null;
    }

    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }

    this.warningCallback = null;
    this.isWarningShown = false;
  }

  /**
   * Get current session status
   */
  getSessionStatus(): {
    isExpired: boolean;
    timeRemaining: number;
    shouldShowWarning: boolean;
    lastActivity: number;
  } {
    return {
      isExpired: this.isSessionExpired(),
      timeRemaining: this.getTimeUntilExpiry(),
      shouldShowWarning: this.shouldShowWarning(),
      lastActivity: this.getLastActivity()
    };
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

/**
 * Utility function to format time remaining
 */
export function formatTimeRemaining(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${seconds} seconds`;
  }
}

/**
 * Check if session is valid (not expired and has token)
 */
export function isSessionValid(): boolean {
  if (!browser) return false;
  
  const token = getStoredAdminToken();
  if (!token) return false;

  return !sessionManager.isSessionExpired();
}
/**
 * ActivityObserver - Centralized document-level activity monitoring
 * 
 * This singleton pattern observer attaches a single set of event listeners to monitor
 * user activity, and broadcasts these events to all registered activity trackers.
 * 
 * This improves performance by reducing event listener duplication while maintaining
 * isolation between different component activity trackers.
 */

import { logDebug } from '$lib/utils/secureLogger';
import { activityStore } from '$lib/stores/activityStore';

// Forward declare ActivityTracker type
import type { ActivityTracker } from './activityUtils';

export class ActivityObserver {
  private static instance: ActivityObserver | null = null;
  private trackers: Set<ActivityTracker> = new Set();
  private isListening: boolean = false;
  private visibilityPaused: boolean = false;
  private pageFocused: boolean = true;

  private constructor() {
    // Add page visibility event listener to pause timers when tab is inactive
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('focus', this.handleFocus);
    window.addEventListener('blur', this.handleBlur);
  }

  public static getInstance(): ActivityObserver {
    if (!ActivityObserver.instance) {
      ActivityObserver.instance = new ActivityObserver();
      logDebug('ActivityObserver singleton created');
    }
    return ActivityObserver.instance;
  }

  /**
   * Register a tracker to receive activity notifications
   */
  public registerTracker(tracker: ActivityTracker): void {
    this.trackers.add(tracker);
    this.ensureListening();
    logDebug(`Tracker registered with ActivityObserver, total: ${this.trackers.size}`);
  }

  /**
   * Unregister a tracker from receiving activity notifications
   */
  public unregisterTracker(tracker: ActivityTracker): void {
    this.trackers.delete(tracker);
    if (this.trackers.size === 0) {
      this.stopListening();
    }
    logDebug(`Tracker unregistered from ActivityObserver, remaining: ${this.trackers.size}`);
  }

  /**
   * Pause all activity trackers (useful for modals, etc.)
   * @param visibilityPause If true, only pauses trackers with pauseOnInvisible=true
   */
  public pauseAllTrackers(visibilityPause: boolean = false): void {
    this.trackers.forEach(tracker => {
      // If this is a visibility pause, only pause trackers that want it
      if (!visibilityPause || tracker.shouldPauseOnInvisible()) {
        tracker.pauseInactivityTimer();
      }
    });
    logDebug('Activity trackers paused', { visibilityPause, count: this.trackers.size });
  }

  /**
   * Resume all activity trackers
   * @param visibilityResume If true, only resumes trackers with pauseOnInvisible=true
   */
  public resumeAllTrackers(visibilityResume: boolean = false): void {
    if (visibilityResume && (this.visibilityPaused || !this.pageFocused)) {
      logDebug('Not resuming trackers - page not visible or focused');
      return;
    }
    
    this.trackers.forEach(tracker => {
      // If this is a visibility resume, only resume trackers that would have been paused
      if (!visibilityResume || tracker.shouldPauseOnInvisible()) {
        tracker.resumeInactivityTimer();
      }
    });
    logDebug('Activity trackers resumed', { visibilityResume, count: this.trackers.size });
  }

  /**
   * Get the total number of active trackers
   */
  public getActiveTrackerCount(): number {
    return this.trackers.size;
  }

  /**
   * Set up required event listeners if not already listening
   */
  private ensureListening(): void {
    if (!this.isListening && this.trackers.size > 0) {
      document.addEventListener('mousedown', this.recordActivity);
      document.addEventListener('keypress', this.recordActivity);
      document.addEventListener('touchstart', this.recordActivity);
      this.isListening = true;
      logDebug('ActivityObserver started listening for events');
    }
  }

  /**
   * Remove event listeners when no trackers are registered
   */
  private stopListening(): void {
    if (this.isListening) {
      document.removeEventListener('mousedown', this.recordActivity);
      document.removeEventListener('keypress', this.recordActivity);
      document.removeEventListener('touchstart', this.recordActivity);
      this.isListening = false;
      logDebug('ActivityObserver stopped listening for events');
    }
  }

  /**
   * Broadcast activity event to all registered trackers
   */
  private recordActivity = (): void => {
    // Use a safe copy of trackers in case any tracker's recordActivity method
    // causes unregisterTracker to be called
    const currentTrackers = Array.from(this.trackers);
    
    // Update each tracker safely 
    currentTrackers.forEach(tracker => {
      try {
        tracker.recordActivity();
      } catch (error) {
        logDebug('Error recording activity in tracker', { error });
      }
    });
    
    // Update the activity store
    activityStore.recordActivity();
  }

  /**
   * Handle page visibility changes to pause/resume timers automatically
   */
  private handleVisibilityChange = (): void => {
    try {
      if (document.hidden) {
        this.visibilityPaused = true;
        this.pauseAllTrackers(true); // true = visibility-related pause
        logDebug('Activity tracking paused due to page visibility change');
      } else {
        this.visibilityPaused = false;
        if (this.pageFocused) {
          this.resumeAllTrackers(true); // true = visibility-related resume
          logDebug('Activity tracking resumed due to page visibility change');
        }
      }
    } catch (error) {
      logDebug('Error in visibility change handler', { error });
    }
  }

  /**
   * Handle window focus events
   */
  private handleFocus = (): void => {
    try {
      this.pageFocused = true;
      if (!this.visibilityPaused) {
        this.resumeAllTrackers(true); // true = visibility-related resume
        logDebug('Activity tracking resumed due to window focus');
      }
    } catch (error) {
      logDebug('Error in focus handler', { error });
    }
  }

  /**
   * Handle window blur events
   */
  private handleBlur = (): void => {
    try {
      this.pageFocused = false;
      this.pauseAllTrackers(true); // true = visibility-related pause
      logDebug('Activity tracking paused due to window blur');
    } catch (error) {
      logDebug('Error in blur handler', { error });
    }
  }

  /**
   * Clean up all resources - mainly for testing purposes
   */
  public cleanup(): void {
    this.stopListening();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('blur', this.handleBlur);
    
    // Clear out any trackers
    this.trackers.clear();
    
    // Reset the instance to allow fresh initialization on next getInstance()
    ActivityObserver.instance = null;
    
    logDebug('ActivityObserver cleaned up');
  }
}
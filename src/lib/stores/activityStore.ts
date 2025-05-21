import { writable } from 'svelte/store';

/**
 * Store to track activity statistics across the application
 * 
 * This provides a central place to monitor activity tracker stats
 * and debug activity-related functionality.
 */

type ActivityStats = {
  totalTrackers: number;
  activeTrackers: string[];
  lastActivity: number;
};

function createActivityStore() {
  const initialState: ActivityStats = {
    totalTrackers: 0,
    activeTrackers: [],
    lastActivity: Date.now()
  };

  const { subscribe, update, set } = writable<ActivityStats>(initialState);

  return {
    subscribe,
    
    /**
     * Register a new activity tracker
     */
    registerTracker: (trackerId: string, serviceType: string) => {
      update(state => {
        return {
          ...state,
          totalTrackers: state.totalTrackers + 1,
          activeTrackers: [...state.activeTrackers, `${trackerId}:${serviceType}`]
        };
      });
    },
    
    /**
     * Unregister an activity tracker
     */
    unregisterTracker: (trackerId: string) => {
      update(state => {
        return {
          ...state,
          totalTrackers: Math.max(0, state.totalTrackers - 1),
          activeTrackers: state.activeTrackers.filter(id => !id.startsWith(`${trackerId}:`))
        };
      });
    },
    
    /**
     * Record activity
     */
    recordActivity: () => {
      update(state => ({
        ...state,
        lastActivity: Date.now()
      }));
    },
    
    /**
     * Reset the store
     */
    reset: () => {
      set(initialState);
    }
  };
}

export const activityStore = createActivityStore();
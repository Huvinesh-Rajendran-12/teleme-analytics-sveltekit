import { writable } from 'svelte/store';

export interface ConnectionState {
  isConnected: boolean;
  lastChecked: number;
  failedServices: string[];
  retryCount: number;
  isRetrying: boolean;
}

// Initial connection state
const initialState: ConnectionState = {
  isConnected: true,
  lastChecked: Date.now(),
  failedServices: [],
  retryCount: 0,
  isRetrying: false
};

// Create the writable store
export const connectionStatus = writable<ConnectionState>(initialState);

// Helper functions to update connection status
export const connectionStore = {
  // Update the connection status
  setStatus: (isConnected: boolean, service?: string) => {
    connectionStatus.update(state => {
      // Update failed services list
      let failedServices = [...state.failedServices];
      
      if (!isConnected && service && !failedServices.includes(service)) {
        failedServices.push(service);
      } else if (isConnected && service) {
        failedServices = failedServices.filter(s => s !== service);
      } else if (isConnected) {
        failedServices = []; // Clear all if connection restored without specific service
      }
      
      return {
        ...state,
        isConnected,
        lastChecked: Date.now(),
        failedServices,
        // Reset retry count if connected, increment otherwise
        retryCount: isConnected ? 0 : state.retryCount,
      };
    });
  },
  
  // Set the retry status
  setRetrying: (isRetrying: boolean) => {
    connectionStatus.update(state => ({
      ...state,
      isRetrying
    }));
  },
  
  // Increment retry count
  incrementRetryCount: () => {
    connectionStatus.update(state => ({
      ...state,
      retryCount: state.retryCount + 1
    }));
  },
  
  // Reset connection status
  reset: () => {
    connectionStatus.set(initialState);
  }
};

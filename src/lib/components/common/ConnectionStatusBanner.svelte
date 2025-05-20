<script lang="ts">
  import { UI_TEXT } from '$lib/config/chatConfig';
  import { connectionStatus } from '$lib/stores/connectionStore';
  import { onDestroy } from 'svelte';
  
  // Props
  export let isConnected: boolean = true; // Local prop for backward compatibility
  export let serviceType: 'analytics' | 'healthTracker' = 'analytics';
  export let onRetry: () => Promise<boolean>;

  // Whether to use the global store or the local prop
  export let useConnectionStore: boolean = true;

  // Use store if enabled, otherwise use the local prop
  $: actualIsConnected = useConnectionStore ? $connectionStatus.isConnected : isConnected;
  $: isRetrying = $connectionStatus.isRetrying;
  $: retryCount = $connectionStatus.retryCount;
  
  // Status message based on service type with more details when multiple retries
  $: statusMessage = UI_TEXT.connection.lost[serviceType] + 
    (retryCount > 1 ? ` (Retry attempt ${retryCount})` : '');
  
  // Track previous connection state to detect actual changes
  let previousConnectionState = true;  // Assume initially connected
  
  // Track whether we've already handled a successful reconnection
  // to prevent duplicate restoration messages
  let hasHandledReconnection = false;
  
  // Handle retry button click
  async function handleRetryClick(event: MouseEvent) {
    // Visual feedback
    const retryBtn = event.currentTarget as HTMLButtonElement;
    if (retryBtn) {
      const originalText = retryBtn.innerText;
      retryBtn.innerText = 'Checking...';
      retryBtn.disabled = true;
      
      try {
        // Before calling onRetry, store the previous state
        const wasConnected = previousConnectionState;
        
        // Wait for the connection check result
        const isNowConnected = await onRetry();
        
        // Only mark as reconnected if it was a true state change from disconnected to connected
        if (!wasConnected && isNowConnected && !hasHandledReconnection) {
          hasHandledReconnection = true;
        }
        
        // Update our tracking variable
        previousConnectionState = isNowConnected;
      } finally {
        // Reset button state after 2 seconds regardless of result
        setTimeout(() => {
          retryBtn.innerText = originalText;
          retryBtn.disabled = false;
        }, 2000);
      }
    }
  }
  
  // Reset the reconnection handling state when connection status changes to disconnected
  $: if (!actualIsConnected) {
    hasHandledReconnection = false;
    previousConnectionState = false;
  }
  
  // When connection state changes from the store, update our tracking variable
  $: {
    previousConnectionState = actualIsConnected;
  }
  
  // Calculate how long connection has been down
  let downTime = '';
  let downTimeInterval: number;
  
  function updateDownTime() {
    if (!actualIsConnected) {
      const downSince = $connectionStatus.lastChecked;
      const diffMs = Date.now() - downSince;
      
      // Format nicely
      if (diffMs < 60000) {
        // Less than a minute
        downTime = 'just now';
      } else if (diffMs < 3600000) {
        // Less than an hour
        const minutes = Math.floor(diffMs / 60000);
        downTime = `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
      } else {
        // Hours
        const hours = Math.floor(diffMs / 3600000);
        downTime = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
      }
    } else {
      downTime = '';
    }
  }
  
  // Start updating downtime display
  function startDownTimeTracking() {
    downTimeInterval = window.setInterval(updateDownTime, 10000); // Update every 10 sec
    updateDownTime(); // Initial update
  }
  
  $: if (!actualIsConnected) {
    startDownTimeTracking();
  } else if (downTimeInterval) {
    clearInterval(downTimeInterval);
  }
  
  onDestroy(() => {
    if (downTimeInterval) {
      clearInterval(downTimeInterval);
    }
  });
</script>

{#if !actualIsConnected}
  <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center mb-2 sm:mb-0">
      <svg class="h-4 w-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <span class="font-medium">{statusMessage}</span>
        {#if downTime}
          <span class="text-xs text-red-600 block">Connection lost {downTime}</span>
        {/if}
      </div>
    </div>
    <button 
      class="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded transition-colors disabled:opacity-50 text-xs sm:text-sm"
      on:click={handleRetryClick}
      disabled={isRetrying}
    >
      {isRetrying ? 'Checking...' : 'Retry Connection'}
    </button>
  </div>
{/if}

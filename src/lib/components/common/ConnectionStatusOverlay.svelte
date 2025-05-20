<script lang="ts">
  import { connectionStatus } from '$lib/stores/connectionStore';
  import { UI_TEXT } from '$lib/config/chatConfig';
  import { fade, fly } from 'svelte/transition';
  import { Icon } from '$lib/icons';
  
  // Props
  export let serviceType: 'analytics' | 'healthTracker' | 'generic' = 'generic';
  export let showOfflineOverlay: boolean = true; // Whether to show a full-screen overlay when offline
  
  // Store values
  $: isConnected = $connectionStatus.isConnected;
  $: isRetrying = $connectionStatus.isRetrying;
  // We don't use retryCount in this component, so no need to define it
  
  // Get appropriate message based on connection status
  $: statusMessage = !isConnected 
    ? UI_TEXT.connection.lost[serviceType]
    : UI_TEXT.connection.restored[serviceType];
    
  // Calculate how long connection has been down
  $: lastChecked = $connectionStatus.lastChecked;
  $: timeSince = getTimeSince(lastChecked);
  
  // Format the time since last check
  function getTimeSince(timestamp: number): string {
    if (isConnected) return '';
    
    const diffMs = Date.now() - timestamp;
    
    if (diffMs < 60000) {
      return 'just now';
    } else if (diffMs < 3600000) {
      const minutes = Math.floor(diffMs / 60000);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else {
      const hours = Math.floor(diffMs / 3600000);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
  }
</script>

{#if !isConnected && showOfflineOverlay}
  <!-- Full Screen Overlay for Offline Mode -->
  <div 
    class="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center"
    transition:fade={{ duration: 300 }}
  >
    <div 
      class="bg-white rounded-lg shadow-lg p-6 m-4 max-w-md"
      transition:fly={{ y: 20, duration: 300 }}
    >
      <div class="flex items-start mb-4">
        <div class="flex-shrink-0 mr-3">
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Icon name="wifi-off" size={24} color="#DC2626" />
          </div>
        </div>
        <div>
          <h3 class="font-bold text-lg text-gray-900">Connection Lost</h3>
          <p class="text-gray-600">{statusMessage}</p>
          <p class="text-xs text-gray-500 mt-1">
            Connection lost {timeSince}
          </p>
        </div>
      </div>
      
      <div class="bg-gray-50 p-3 rounded-md mb-4">
        <p class="text-sm text-gray-600">{UI_TEXT.offline.limitedFeatures}</p>
      </div>
      
      <div class="flex justify-end space-x-3">
        {#if isRetrying}
          <button 
            class="px-4 py-2 text-gray-500 rounded bg-gray-200 cursor-not-allowed opacity-70"
            disabled
          >
            <div class="flex items-center">
              <span class="mr-2">Reconnecting</span>
              <div class="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </button>
        {:else}
          <button 
            class="px-4 py-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 active:bg-blue-200"
            on:click={() => window.location.reload()}
          >
            Refresh Page
          </button>
        {/if}
      </div>
    </div>
  </div>
{:else if !isConnected}
  <!-- Minimal Banner for Offline Mode -->
  <div class="sticky top-0 left-0 right-0 z-40 bg-red-500 text-white py-1 px-4 text-sm flex justify-between items-center"
    transition:fly={{ y: -20, duration: 300 }}
  >
    <div class="flex items-center">
      <div class="mr-2">
        <Icon name="wifi-off" size={16} color="white" />
      </div>
      <span class="font-medium">{serviceType === 'generic' ? 'Connection lost' : statusMessage}</span>
    </div>
    
    {#if isRetrying}
      <span class="text-xs flex items-center">
        Reconnecting
        <span class="ml-1 inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
      </span>
    {:else}
      <button 
        class="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 rounded px-2 py-1"
        on:click={() => window.location.reload()}
      >
        Refresh
      </button>
    {/if}
  </div>
{/if}

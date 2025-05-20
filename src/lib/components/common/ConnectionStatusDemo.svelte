<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { connectionStatus, connectionStore } from '$lib/stores/connectionStore';
  import { 
    CONNECTION_CHECK_INTERVAL, 
    CONNECTION_RETRY_MAX 
  } from '$lib/config/chatConfig';
  import { checkConnectionStatus } from '$lib/utils/connectionUtils';
  
  // Props
  export let endpoint: string = '/api/health';
  export let autoConnect: boolean = true;
  
  // Local state
  let manualModeEnabled = false;
  let localConnectionStatus = true;
  let checkingConnection = false;
  // Store the retry count from the store instead of a local variable
  let demoInterval: number | null = null;
  
  // Toggle the connection status (for demo purposes)
  function toggleConnectionStatus() {
    if (!manualModeEnabled) return;
    
    localConnectionStatus = !localConnectionStatus;
    connectionStore.setStatus(localConnectionStatus, 'demo');
  }
  
  // Check connection status
  async function checkConnection() {
    if (checkingConnection) return;
    
    checkingConnection = true;
    connectionStore.setRetrying(true);
    
    try {
      const online = await checkConnectionStatus(endpoint);
      connectionStore.setStatus(online, 'demo');
      
      if (online) {
        // Reset retry count in store
        connectionStore.reset();
      } else {
        // Increment retry count in store
        connectionStore.incrementRetryCount();
      }
      
      localConnectionStatus = online;
      return online;
    } finally {
      checkingConnection = false;
      connectionStore.setRetrying(false);
    }
  }
  
  // Toggle manual mode
  function toggleManualMode() {
    manualModeEnabled = !manualModeEnabled;
    
    if (manualModeEnabled) {
      // Stop auto checks when manual mode is enabled
      stopAutoConnect();
    } else if (autoConnect) {
      // Resume auto checks if autoConnect is true
      startAutoConnect();
    }
  }
  
  // Start automatic connection checking
  function startAutoConnect() {
    if (demoInterval) {
      clearInterval(demoInterval);
    }
    
    demoInterval = window.setInterval(async () => {
      if (manualModeEnabled) return;
      await checkConnection();
    }, CONNECTION_CHECK_INTERVAL);
  }
  
  // Stop automatic connection checking
  function stopAutoConnect() {
    if (demoInterval) {
      clearInterval(demoInterval);
      demoInterval = null;
    }
  }
  
  // Reset connection status
  function resetConnectionStatus() {
    connectionStore.reset();
    localConnectionStatus = true;
  }
  
  onMount(() => {
    // Initial check
    checkConnection();
    
    // Start automatic checks if enabled
    if (autoConnect && !manualModeEnabled) {
      startAutoConnect();
    }
  });
  
  onDestroy(() => {
    // Clean up intervals
    stopAutoConnect();
  });
</script>

<div class="bg-white rounded-lg shadow-md p-4 border border-gray-200 mb-6">
  <h3 class="text-lg font-medium text-gray-900 mb-3">Connection Status Monitor</h3>
  
  <div class="flex flex-col gap-4">
    <!-- Connection Status -->
    <div class="flex items-center">
      <div class="flex-shrink-0 mr-2">
        {#if $connectionStatus.isConnected}
          <div class="w-4 h-4 rounded-full bg-green-500 animate-pulse"></div>
        {:else}
          <div class="w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>
        {/if}
      </div>
      <div>
        <p class="text-sm font-medium text-gray-900">
          {$connectionStatus.isConnected ? 'Connected' : 'Disconnected'}
        </p>
        <p class="text-xs text-gray-500">
          Last updated: {new Date($connectionStatus.lastChecked).toLocaleTimeString()}
        </p>
      </div>
    </div>
    
    <!-- Stats -->
    <div class="grid grid-cols-2 gap-2 text-sm bg-gray-50 p-2 rounded">
      <div>Services:</div>
      <div>
        {$connectionStatus.failedServices.length === 0 
          ? 'All online' 
          : $connectionStatus.failedServices.join(', ')}
      </div>
      
      <div>Retry count:</div>
      <div>{$connectionStatus.retryCount} / {CONNECTION_RETRY_MAX}</div>
      
      <div>Status:</div>
      <div>{$connectionStatus.isRetrying ? 'Checking...' : 'Idle'}</div>
    </div>
    
    <!-- Controls -->
    <div class="flex flex-wrap gap-2">
      <!-- Manual Controls (when enabled) -->
      {#if manualModeEnabled}
        <button 
          on:click={toggleConnectionStatus}
          class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          Toggle Status ({localConnectionStatus ? 'Connected' : 'Disconnected'})
        </button>
      {/if}
      
      <!-- Connection Check Button -->
      <button 
        on:click={checkConnection}
        disabled={checkingConnection}
        class="px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {checkingConnection ? 'Checking...' : 'Check Now'}
      </button>
      
      <!-- Toggle Manual Mode -->
      <button 
        on:click={toggleManualMode}
        class="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
      >
        {manualModeEnabled ? 'Auto Mode' : 'Manual Mode'}
      </button>
      
      <!-- Reset Button -->
      <button 
        on:click={resetConnectionStatus}
        class="px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 text-sm"
      >
        Reset
      </button>
    </div>
  </div>
</div>

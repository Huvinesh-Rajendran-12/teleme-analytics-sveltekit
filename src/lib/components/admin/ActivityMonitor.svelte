<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { activityStore } from '$lib/stores/activityStore';
  import { connectionStatus } from '$lib/stores/connectionStore';
  import { ActivityObserver } from '$lib/utils/activityObserver';

  let refreshInterval: ReturnType<typeof setInterval> | null = null;
  let lastActivityAgo = 0;
  
  $: {
    // Calculate time since last activity
    if ($activityStore.lastActivity) {
      lastActivityAgo = Math.floor((Date.now() - $activityStore.lastActivity) / 1000);
    }
  }
  
  function pauseAllTimers() {
    ActivityObserver.getInstance().pauseAllTrackers();
  }
  
  function resumeAllTimers() {
    ActivityObserver.getInstance().resumeAllTrackers();
  }
  
  onMount(() => {
    // Update the "seconds ago" counter every second
    refreshInterval = setInterval(() => {
      if ($activityStore.lastActivity) {
        lastActivityAgo = Math.floor((Date.now() - $activityStore.lastActivity) / 1000);
      }
    }, 1000);
  });
  
  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });
</script>

<div class="bg-white p-4 rounded-lg shadow">
  <h2 class="text-lg font-medium mb-4">Activity Monitor</h2>
  
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-gray-50 p-3 rounded">
        <div class="text-sm text-gray-500">Active Trackers</div>
        <div class="text-xl font-semibold">{$activityStore.totalTrackers}</div>
      </div>
      
      <div class="bg-gray-50 p-3 rounded">
        <div class="text-sm text-gray-500">Last Activity</div>
        <div class="text-xl font-semibold">{lastActivityAgo} seconds ago</div>
      </div>
    </div>
    
    <div>
      <div class="text-sm text-gray-500 mb-2">Connection Status</div>
      <div class="flex items-center">
        <div class={`w-3 h-3 rounded-full mr-2 ${$connectionStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span>{$connectionStatus.isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
      {#if $connectionStatus.isRetrying}
        <div class="text-xs text-blue-500 mt-1">Retrying connection...</div>
      {/if}
      {#if $connectionStatus.failedServices.length > 0}
        <div class="text-xs text-red-500 mt-1">
          Failed services: {$connectionStatus.failedServices.join(', ')}
        </div>
      {/if}
    </div>
    
    {#if $activityStore.activeTrackers.length > 0}
      <div>
        <div class="text-sm text-gray-500 mb-2">Active Tracker IDs</div>
        <div class="bg-gray-50 p-2 rounded text-xs">
          <ul class="list-disc pl-4">
            {#each $activityStore.activeTrackers as tracker}
              <li>{tracker}</li>
            {/each}
          </ul>
        </div>
      </div>
    {/if}
    
    <div class="flex space-x-2 mt-4">
      <button 
        on:click={pauseAllTimers}
        class="px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded"
      >
        Pause All Timers
      </button>
      
      <button 
        on:click={resumeAllTimers}
        class="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-800 rounded"
      >
        Resume All Timers
      </button>
    </div>
  </div>
</div>
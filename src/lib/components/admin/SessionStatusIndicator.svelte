<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { sessionManager, formatTimeRemaining } from '$lib/utils/sessionManager';
  import { getStoredAdminToken } from '$lib/utils/auth';
  import { browser } from '$app/environment';

  // Props
  export let showInDev = true;

  // State
  let sessionStatus = {
    isExpired: false,
    timeRemaining: 0,
    shouldShowWarning: false,
    lastActivity: Date.now()
  };
  let statusUpdateInterval: NodeJS.Timeout | null = null;
  let isVisible = false;

  // Determine if running in development
  const isDev = browser && import.meta.env.DEV;

  function updateSessionStatus() {
    if (!getStoredAdminToken()) {
      isVisible = false;
      return;
    }

    sessionStatus = sessionManager.getSessionStatus();
    isVisible = showInDev && isDev;
  }

  onMount(() => {
    if (!browser || !isDev || !showInDev) return;

    updateSessionStatus();
    
    // Update status every 5 seconds
    statusUpdateInterval = setInterval(updateSessionStatus, 5000);
  });

  onDestroy(() => {
    if (statusUpdateInterval) {
      clearInterval(statusUpdateInterval);
    }
  });

  $: statusColor = sessionStatus.isExpired 
    ? 'bg-red-500' 
    : sessionStatus.shouldShowWarning 
      ? 'bg-yellow-500' 
      : 'bg-green-500';

  $: statusText = sessionStatus.isExpired 
    ? 'Expired' 
    : sessionStatus.shouldShowWarning 
      ? 'Warning' 
      : 'Active';
</script>

{#if isVisible}
  <div class="fixed bottom-4 right-4 z-50 max-w-xs">
    <div class="rounded-lg bg-white p-3 shadow-lg border border-gray-200">
      <div class="flex items-center space-x-2">
        <div class="flex-shrink-0">
          <div class="w-3 h-3 rounded-full {statusColor}"></div>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900">Session: {statusText}</p>
          <p class="text-xs text-gray-500">
            {#if sessionStatus.isExpired}
              Session has expired
            {:else}
              Expires in: {formatTimeRemaining(sessionStatus.timeRemaining)}
            {/if}
          </p>
        </div>
      </div>
      
      {#if sessionStatus.shouldShowWarning && !sessionStatus.isExpired}
        <div class="mt-2 text-xs text-yellow-600">
          ⚠️ Session timeout warning active
        </div>
      {/if}
      
      <div class="mt-1 text-xs text-gray-400">
        Last activity: {new Date(sessionStatus.lastActivity).toLocaleTimeString()}
      </div>
    </div>
  </div>
{/if}
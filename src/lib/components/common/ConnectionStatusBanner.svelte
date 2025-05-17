<script lang="ts">
  import { UI_TEXT } from '$lib/config/chatConfig';
  
  // Props
  export let isConnected: boolean = true;
  export let serviceType: 'analytics' | 'healthTracker' = 'analytics';
  export let onRetry: () => Promise<boolean>;

  // Status message based on service type
  $: statusMessage = UI_TEXT.connection.lost[serviceType];
  
  // Handle retry button click
  async function handleRetryClick(event: MouseEvent) {
    // Visual feedback
    const retryBtn = event.currentTarget as HTMLButtonElement;
    if (retryBtn) {
      const originalText = retryBtn.innerText;
      retryBtn.innerText = 'Checking...';
      retryBtn.disabled = true;
      
      try {
        // Wait for the connection check result
        await onRetry();
      } finally {
        // Reset button state after 2 seconds regardless of result
        setTimeout(() => {
          retryBtn.innerText = originalText;
          retryBtn.disabled = false;
        }, 2000);
      }
    }
  }
</script>

{#if !isConnected}
  <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 text-sm flex items-center justify-between">
    <div class="flex items-center">
      <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{statusMessage}</span>
    </div>
    <button 
      class="text-red-700 hover:text-red-900 focus:outline-none" 
      on:click={handleRetryClick}
    >
      Retry
    </button>
  </div>
{/if}

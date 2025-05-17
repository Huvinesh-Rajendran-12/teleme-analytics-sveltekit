<script lang="ts">
  // Props
  export let state: string = 'processing';
  export let centered: boolean = true;
  
  // Compute the state text based on the current state
  $: stateText = getStateText(state);
  $: stateIcon = getStateIcon(state);
  
  // Helper functions to get text and icon based on state
  function getStateText(state: string): string {
    switch (state.toLowerCase()) {
      case 'connecting':
        return 'Connecting';
      case 'processing':
        return 'Processing';
      case 'analyzing':
        return 'Analyzing results';
      case 'finalizing':
        return 'Preparing response';
      default:
        return 'Processing';
    }
  }
  
  function getStateIcon(state: string): string {
    switch (state.toLowerCase()) {
      case 'connecting':
        return '🔄';
      case 'processing':
        return '⚙️';
      case 'analyzing':
        return '🔍';
      case 'finalizing':
        return '📊';
      default:
        return '';
    }
  }
</script>

<div class="thinking-loader {centered ? 'flex justify-center items-center my-6' : ''}">
  <div class="thinking-inline">
    <span class="thinking-text flex items-center">
      {stateText}
      {#if stateIcon}
        <span class="ml-2">
          {stateIcon}
        </span>
      {/if}
      <div class="thinking-dots-inline ml-1">
        <span></span><span></span><span></span>
      </div>
    </span>
  </div>
</div>

<style>
  /* Base styles for the thinking indicator */
  :global(.thinking-loader) {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
  }

  :global(.thinking-inline) {
    display: flex;
    align-items: center;
  }

  :global(.thinking-text) {
    font-size: 0.875rem; /* text-sm */
    color: #6b7280; /* text-gray-500 */
    margin-right: 0.5rem; /* mr-2 */
  }

  /* Styles for the pulsing dots */
  :global(.thinking-dots-inline) {
    display: flex;
    align-items: center;
    height: 1em; /* Match text height */
  }

  :global(.thinking-dots-inline span) {
    display: inline-block;
    width: 6px; /* Adjust size as needed */
    height: 6px; /* Adjust size as needed */
    background-color: #6b7280; /* Match text color */
    border-radius: 50%;
    margin: 0 2px; /* Space between dots */
    animation: pulse 1.4s infinite ease-in-out both;
  }

  :global(.thinking-dots-inline span:nth-child(1)) {
    animation-delay: -0.32s;
  }

  :global(.thinking-dots-inline span:nth-child(2)) {
    animation-delay: -0.16s;
  }

  /* Keyframes for the pulse animation */
  @keyframes pulse {
    0%,
    80%,
    100% {
      opacity: 0;
      transform: scale(0);
    }
    40% {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>

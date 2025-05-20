<script lang="ts">
  import { Icon } from '$lib/icons';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher<{
    stop: void;
  }>();
  
  export let isVisible = false;
  export let variant: 'default' | 'compact' = 'default';
  
  function handleStopClick() {
    dispatch('stop');
  }
</script>

{#if isVisible}
  <button
    on:click={handleStopClick}
    class="{variant === 'default'
      ? 'mt-4 px-6 py-2'
      : 'px-4 py-1.5'} 
      bg-red-500 hover:bg-red-600 text-white font-medium rounded-full flex items-center transition-colors"
    aria-label="Stop Processing"
  >
    <span class="mr-2"><Icon name="close" size={variant === 'default' ? 16 : 14} /></span>
    <span>Stop Processing</span>
  </button>
{/if}

<style>
  button {
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    transition: all 0.2s ease-in-out;
  }
  
  button:hover {
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    transform: translateY(-1px);
  }
  
  button:active {
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    transform: translateY(0);
  }
</style>
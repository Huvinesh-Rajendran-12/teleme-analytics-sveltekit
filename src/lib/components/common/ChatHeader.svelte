<script lang="ts">
  import { Icon } from '$lib/icons';
  import { createEventDispatcher } from 'svelte';
  
  // Props
  export let title: string = "AI Assistant";
  export let showMinimize: boolean = true;
  export let showClose: boolean = true;
  
  // Event dispatcher
  const dispatch = createEventDispatcher<{
    minimize: void;
    close: void;
  }>();
  
  // Handlers
  function handleMinimize() {
    dispatch('minimize');
  }
  
  function handleClose() {
    dispatch('close');
  }
</script>

<div class="chat-header bg-teal-500 text-white px-4 py-3 flex items-center justify-between shadow-md">
  <div class="title-area flex items-center">
    <span class="font-medium">{title}</span>
  </div>
  
  <div class="controls flex items-center space-x-3">
    {#if showMinimize}
      <button 
        on:click={handleMinimize}
        class="minimize-btn p-1 rounded-full hover:bg-teal-400 transition-colors"
        aria-label="Minimize"
      >
        <Icon name="minimize" size={20} color="#FFFFFF" />
      </button>
    {/if}
    
    {#if showClose}
      <button 
        on:click={handleClose}
        class="close-btn p-1 rounded-full hover:bg-teal-400 transition-colors"
        aria-label="Close"
      >
        <Icon name="close" size={20} color="#FFFFFF" />
      </button>
    {/if}
  </div>
</div>

<style>
  .chat-header {
    border-radius: 0.25rem 0.25rem 0 0;
  }
</style>
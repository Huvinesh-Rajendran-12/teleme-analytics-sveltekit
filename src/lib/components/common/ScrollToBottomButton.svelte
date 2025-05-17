<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // Create a dispatcher to handle events
  const dispatch = createEventDispatcher<{
    scroll: void;
  }>();
  
  // Props
  export let isVisible: boolean = false;
  export let position: 'default' | 'chat' = 'default';
  
  // Handle click to scroll to bottom
  function handleClick() {
    dispatch('scroll');
  }
  
  // Position classes based on the position prop
  $: positionClasses = position === 'chat'
    ? 'bottom-28 right-4 md:right-8 lg:right-12'
    : 'bottom-20 right-6';
</script>

{#if isVisible}
  <button
    on:click={handleClick}
    class="fixed {positionClasses} bg-gradient-to-br from-blue-500 to-teal-400 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl scroll-to-bottom-button"
    aria-label="Scroll to bottom"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M19 14l-7 7m0 0l-7-7m7 7V3"
      />
    </svg>
  </button>
{/if}

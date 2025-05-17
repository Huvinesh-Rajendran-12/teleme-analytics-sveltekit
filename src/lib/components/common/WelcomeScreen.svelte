<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // Create a dispatcher to handle events
  const dispatch = createEventDispatcher<{
    start: void;
  }>();
  
  // Props
  export let title: string = 'Chat Assistant';
  export let subtitle: string = 'Your intelligent assistant';
  export let buttonText: string = 'Start New Conversation';
</script>

<div class="flex flex-col items-center justify-center py-20 w-full">
  <div class="flex flex-col items-center">
    <div class="rounded-full bg-gradient-to-br-blue-teal shadow mb-8">
      <div
        class="logo-circle flex items-center justify-center text-white text-5xl font-bold"
      >
        T
      </div>
    </div>
    <h2 class="text-3xl font-bold mb-4 text-center gradient-text">
      {title}
    </h2>
    <p class="text-gray-600 mb-8 text-base max-w-xl text-center">
      {subtitle}
    </p>
    <div class="flex justify-center">
      <button
        on:click={() => dispatch('start')}
        class="btn-gradient-large py-3 px-8 rounded-full shadow"
      >
        <div class="flex items-center justify-center">
          <span class="text-xl">🚀</span>
          <span class="text-base font-medium mx-2"> {buttonText} </span>
        </div>
      </button>
    </div>
  </div>
</div>

<style>
  /* Gradient styles */
  :global(.bg-gradient-to-br-blue-teal) {
    background-image: linear-gradient(
      to bottom right,
      var(--color-primary-500, #3b82f6),
      var(--color-teal-500, #14b8a6)
    );
  }
  
  :global(.gradient-text) {
    background-clip: text;
    -webkit-background-clip: text;
    background-image: linear-gradient(
      to bottom right,
      var(--color-primary-500, #3b82f6),
      var(--color-teal-500, #14b8a6)
    );
    color: transparent;
  }
  
  :global(.btn-gradient-large) {
    background-image: linear-gradient(
      to bottom right,
      var(--color-primary-500, #3b82f6),
      var(--color-teal-500, #14b8a6)
    );
    color: white;
    border: none;
  }
  
  .logo-circle {
    width: 80px;
    height: 80px;
    border-radius: 50%;
  }
</style>

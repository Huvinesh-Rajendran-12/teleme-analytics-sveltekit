<script lang="ts">
  import OptionsButtons from '../OptionsButtons.svelte';
  import type { OptionsButtonType } from '$lib/types';
  import { createEventDispatcher } from 'svelte';
  
  // Create a dispatcher to handle events
  const dispatch = createEventDispatcher<{
    select: string;
    startNew: void;
    submit: string;
  }>();
  
  // Props
  export let stage: string = 'welcome';
  export let buttons: OptionsButtonType[] = [];
  export let durationInput: string = '12';
  export let durationError: string | null = null;
  export let loading: boolean = false;
  export let hasMessages: boolean = false;
  
  // Handle button selection
  function handleSelect(id: string) {
    dispatch('select', id);
  }
  
  // Handle start new conversation
  function handleStartNew() {
    dispatch('startNew');
  }
  
  // Handle duration submit
  function handleDurationSubmit() {
    dispatch('submit', durationInput);
  }
</script>

<div class="mt-4">
  {#if stage === 'welcome' && hasMessages}
    <!-- Welcome stage with existing messages - Start new conversation -->
    <div class="flex justify-center my-4">
      <button
        class="btn btn-primary flex items-center px-6 py-3 rounded-full btn-gradient"
        on:click={handleStartNew}
        disabled={loading}
      >
        <div class="flex items-center justify-center">
          <span class="text-base">👋</span>
          <span class="font-medium text-sm mx-2">Start New Conversation</span>
        </div>
      </button>
    </div>
  {:else if stage === 'asking_duration'}
    <!-- Duration selection stage -->
    <div class="flex items-center justify-center">
      <div class="relative mr-3">
        <input
          type="number"
          bind:value={durationInput}
          min="1"
          max="60"
          class="input-number border rounded-lg px-4 py-2 w-24 text-center font-medium {durationError
            ? 'border-red-500'
            : 'border-gray-300'}"
          placeholder="12"
          disabled={loading}
        />
      </div>
      <button
        on:click={handleDurationSubmit}
        class="btn-gradient text-white font-semibold py-2 px-5 rounded-full shadow"
        disabled={loading}
      >
        <div class="flex items-center justify-center">
          <span class="text-base">✅</span>
          <span class="font-medium text-sm mx-1"> Submit </span>
        </div>
      </button>
    </div>
    {#if durationError}
      <div class="text-red-500 text-sm mt-2 text-center">
        {durationError}
      </div>
    {/if}
  {:else}
    <!-- Other stages with buttons -->
    <OptionsButtons
      buttons={buttons}
      onSelect={handleSelect}
    />
  {/if}
</div>

<style>
  /* Gradient button styles */
  :global(.btn-gradient) {
    background-image: linear-gradient(
      to bottom right,
      var(--color-primary-500, #3b82f6),
      var(--color-teal-500, #14b8a6)
    );
    color: white;
    border: none;
  }
  
  /* Disabled state */
  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
</style>

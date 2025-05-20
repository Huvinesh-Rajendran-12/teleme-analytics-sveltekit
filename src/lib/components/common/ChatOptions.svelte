<script lang="ts">
  import OptionsButtons from '../OptionsButtons.svelte';
  import DurationInput from './DurationInput.svelte';
  import type { OptionsButtonType } from '$lib/types';
  import { createEventDispatcher } from 'svelte';
  import { Icon } from '$lib/icons';
  
  // Create a dispatcher to handle events
  const dispatch = createEventDispatcher<{
    select: string;
    startNew: void;
    submit: string;
    stop: void;
  }>();
  
  // Props
  export let stage: string = 'welcome';
  export let buttons: OptionsButtonType[] = [];
  export let durationInput: string = '12';
  export let durationError: string | null = null;
  export let loading: boolean = false;
  export let isProcessing: boolean = false;
  export let hasMessages: boolean = false;
  
  // Handle button selection
  function handleSelect(id: string) {
    console.debug('Button selected:', id);
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
  
  // Handle duration change
  function handleDurationChange(event: CustomEvent<string>) {
    durationInput = event.detail;
  }
  
  // Handle stop button click
  function handleStop() {
    dispatch('stop');
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
      <div class="mr-3">
        <DurationInput 
          value={durationInput}
          error={null} 
          disabled={loading}
          min={1}
          max={60}
          on:change={handleDurationChange}
          on:submit={handleDurationSubmit}
        />
      </div>
      <button
        on:click={handleDurationSubmit}
        class="pulse-button text-white font-semibold py-2 px-5 rounded-full shadow relative overflow-hidden"
        disabled={loading}
      >
        <div class="flex items-center justify-center relative z-10">
          <span class="font-medium text-sm"> Continue </span>
          <span class="ml-1">→</span>
        </div>
        <span class="pulse-wave"></span>
      </button>
      
      {#if loading && isProcessing}
        <button
          on:click={handleStop}
          class="ml-3 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-5 rounded-full flex items-center"
        >
          <span class="mr-1"><Icon name="close" size={16} /></span>
          <span>Stop</span>
        </button>
      {/if}
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
      var(--color-teal-500, #26A69A),
      var(--color-teal-600, #00897B)
    );
    color: white;
    border: none;
  }
  
  /* Pulse button styles */
  .pulse-button {
    background-color: var(--color-teal-500, #26A69A);
    transition: all 0.3s ease;
    transform: translateZ(0);
  }
  
  .pulse-button:hover {
    background-color: var(--color-teal-600, #00897B);
  }
  
  .pulse-wave {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.3);
    border-radius: inherit;
    opacity: 0;
    transform: scale(1);
    z-index: 0;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0% {
      opacity: 0.5;
      transform: scale(1);
    }
    70% {
      opacity: 0;
      transform: scale(1.5);
    }
    100% {
      opacity: 0;
      transform: scale(1.5);
    }
  }
  
  /* Disabled state */
  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  button:disabled .pulse-wave {
    animation: none;
  }
</style>

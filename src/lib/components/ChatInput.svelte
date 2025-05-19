<script lang="ts">
  import { onMount } from 'svelte';
  import { Icon } from '$lib/icons';
  
  export let disabled = false;
  export let onSendQuestion: (message: string) => void;
  export let maxLength: number | undefined = undefined;

  onMount(() => {
    console.debug('ChatInput component mounted');
  });

  let inputMessage = '';
  let inputElement: HTMLTextAreaElement;

  $: charsOverLimit = maxLength ? Math.max(0, inputMessage.length - maxLength) : 0;

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    if (inputMessage.trim() === '' || disabled) return;

    onSendQuestion(inputMessage.trim());
    inputMessage = '';

    // Reset textarea height
    if (inputElement) {
      inputElement.style.height = 'auto';
    }
  }

  function adjustTextareaHeight() {
    if (!inputElement) return;

    // Reset height to auto so we can determine the new scrollHeight
    inputElement.style.height = 'auto';

    // Set to scrollHeight to have the textarea grow
    const maxHeight = 150; // Maximum height before scrolling
    inputElement.style.height = `${Math.min(inputElement.scrollHeight, maxHeight)}px`;
  }

  $: {
    // This will run when inputMessage changes
    if (inputElement) {
      adjustTextareaHeight();
    }
  }
</script>

<div class="relative w-full">
  <div class="flex items-end bg-white rounded-lg shadow-sm border border-gray-200 pr-2">
    <textarea
      bind:this={inputElement}
      bind:value={inputMessage}
      on:keydown={handleKeyDown}
      on:input={adjustTextareaHeight}
      rows="1"
      class="flex-grow resize-none overflow-auto py-3 px-4 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-lg"
      style="min-height: 3rem; max-height: 150px;"
      placeholder="Type your question here..."
      maxlength={maxLength}
      {disabled}
    ></textarea>

    <button
      on:click={handleSend}
      class="ml-2 mb-2 p-2 rounded-full send-button text-white focus:outline-none hover:send-button-hover disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden"
      disabled={inputMessage.trim() === '' || disabled || charsOverLimit > 0}
      aria-label="Send message"
    >
      <span class="relative z-10"><Icon name="send" size={20} /></span>
      <span class="send-wave"></span>
    </button>
  </div>
  {#if maxLength !== undefined}
    <p class="text-gray-500 text-xs mt-1 text-right">{inputMessage.length}/{maxLength}</p>
  {/if}
  {#if charsOverLimit > 0}
    <p class="text-red-500 text-sm mt-1 text-right">
      Characters over limit: {charsOverLimit}
    </p>
  {/if}
</div>

<style>
  textarea {
    font-size: 0.95rem;
    line-height: 1.5;
  }
  
  .send-button {
    background-color: var(--color-teal-500, #26A69A);
  }
  
  .send-button:hover {
    background-color: var(--color-teal-600, #00897B);
  }
  
  .send-wave {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%);
    border-radius: inherit;
    opacity: 0;
    transform: scale(0);
    z-index: 0;
    pointer-events: none;
  }
  
  button:not(:disabled):hover .send-wave {
    animation: ripple 1s cubic-bezier(0, 0, 0.2, 1);
  }
  
  @keyframes ripple {
    0% {
      transform: scale(0);
      opacity: 0.7;
    }
    100% {
      transform: scale(2.5);
      opacity: 0;
    }
  }
</style>

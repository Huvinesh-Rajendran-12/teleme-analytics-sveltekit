<script lang="ts">
  import { Icon } from '$lib/icons';
  
  export let disabled = false;
  export let onSendQuestion: (message: string) => void;
  export let maxLength: number | undefined = undefined;
  // console.log("onSendQuestion prop:", onSendQuestion);

  let inputMessage = '';
  let inputElement: HTMLTextAreaElement;

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
      class="ml-2 mb-2 p-2 rounded-full bg-blue-500 text-white focus:outline-none hover:bg-blue-600 disabled:opacity-50 disabled:pointer-events-none"
      disabled={inputMessage.trim() === '' || disabled}
      aria-label="Send message"
    >
      <Icon name="send" size={20} />
    </button>
  </div>
</div>

<style>
  textarea {
    font-size: 0.95rem;
    line-height: 1.5;
  }
</style>
